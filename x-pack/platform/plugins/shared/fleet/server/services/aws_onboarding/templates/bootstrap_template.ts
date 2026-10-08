/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const BOOTSTRAP_TEMPLATE_FILENAME = 'kibana-managed-onboarding-bootstrap.yml';

/**
 * Bootstrap CloudFormation template served to the browser for download. Kept in sync by hand
 * with kibana_managed_onboarding_bootstrap.yml in this folder (the YAML is not shipped in the
 * build, the TS constant is).
 */
export const BOOTSTRAP_TEMPLATE_YAML = `AWSTemplateFormatVersion: "2010-09-09"
Description: >-
  POC ONLY. One-time bootstrap for Kibana-managed AWS onboarding: creates a least-privilege IAM
  user whose access key Kibana stores (encrypted) and uses to create and update the Elastic
  Federated Identity CloudFormation stacks named <StackNamePrefix>-*. The access key is written
  to AWS Secrets Manager; nothing sensitive is exposed as a stack output. The user may also delete
  this stack (and with it its own key and secret) so that removing the credentials from Kibana
  leaves nothing behind in AWS. A production version would hand Kibana a role to assume
  (temporary credentials) instead of a long-lived access key.

Parameters:
  StackNamePrefix:
    Type: String
    Default: elastic-onboarding
    AllowedPattern: "^[a-zA-Z][a-zA-Z0-9-]{0,39}$"
    Description: Kibana may only manage CloudFormation stacks whose names start with this prefix.

Resources:
  KibanaOnboardingUser:
    Type: AWS::IAM::User
    Properties:
      UserName: !Sub "kibana-managed-onboarding-\${AWS::StackName}"
      Policies:
        - PolicyName: KibanaManagedOnboarding
          PolicyDocument:
            Version: "2012-10-17"
            Statement:
              - Sid: ManagePrefixedStacks
                Effect: Allow
                Action:
                  - cloudformation:CreateStack
                  - cloudformation:UpdateStack
                  - cloudformation:DeleteStack
                  - cloudformation:DescribeStacks
                  - cloudformation:DescribeStackEvents
                  - cloudformation:GetTemplate
                Resource: !Sub "arn:\${AWS::Partition}:cloudformation:*:\${AWS::AccountId}:stack/\${StackNamePrefix}-*/*"
              - Sid: InspectTemplates
                Effect: Allow
                Action:
                  - cloudformation:GetTemplateSummary
                  - cloudformation:ValidateTemplate
                  - cloudformation:ListStacks
                Resource: "*"
              - Sid: ManageIdentityRoles
                Effect: Allow
                Action:
                  - iam:CreateRole
                  - iam:DeleteRole
                  - iam:GetRole
                  - iam:UpdateRole
                  - iam:UpdateAssumeRolePolicy
                  - iam:PutRolePolicy
                  - iam:DeleteRolePolicy
                  - iam:GetRolePolicy
                  - iam:AttachRolePolicy
                  - iam:DetachRolePolicy
                  - iam:TagRole
                  - iam:UntagRole
                Resource:
                  - !Sub "arn:\${AWS::Partition}:iam::\${AWS::AccountId}:role/ElasticWorkloadIdentity*"
                  - !Sub "arn:\${AWS::Partition}:iam::\${AWS::AccountId}:role/\${StackNamePrefix}-*"
              - Sid: PassLambdaRoleToLambda
                Effect: Allow
                Action: iam:PassRole
                Resource: !Sub "arn:\${AWS::Partition}:iam::\${AWS::AccountId}:role/\${StackNamePrefix}-*"
                Condition:
                  StringEquals:
                    iam:PassedToService: lambda.amazonaws.com
              - Sid: ManageOidcProviderFunction
                Effect: Allow
                Action:
                  - lambda:CreateFunction
                  - lambda:DeleteFunction
                  - lambda:GetFunction
                  - lambda:GetFunctionConfiguration
                  - lambda:UpdateFunctionCode
                  - lambda:UpdateFunctionConfiguration
                  - lambda:InvokeFunction
                  - lambda:TagResource
                  - lambda:ListTags
                Resource: !Sub "arn:\${AWS::Partition}:lambda:*:\${AWS::AccountId}:function:\${StackNamePrefix}-*"
              # Self-cleanup when the credentials are removed from Kibana. CloudFormation deletes the
              # secret, then the access key, then the user; the session it opened with the key stays
              # valid for those remaining calls.
              - Sid: DeleteThisBootstrapStack
                Effect: Allow
                Action:
                  - cloudformation:DeleteStack
                  - cloudformation:DescribeStacks
                  - cloudformation:DescribeStackEvents
                Resource: !Ref AWS::StackId
              - Sid: DeleteOwnUser
                Effect: Allow
                Action:
                  - iam:DeleteUser
                  - iam:DeleteUserPolicy
                  - iam:DeleteAccessKey
                  - iam:ListAccessKeys
                  - iam:GetUser
                  - iam:ListUserPolicies
                  - iam:ListAttachedUserPolicies
                  - iam:ListGroupsForUser
                Resource: !Sub "arn:\${AWS::Partition}:iam::\${AWS::AccountId}:user/kibana-managed-onboarding-\${AWS::StackName}"
              - Sid: DeleteOwnSecret
                Effect: Allow
                Action:
                  - secretsmanager:DeleteSecret
                  - secretsmanager:DescribeSecret
                Resource: !Sub "arn:\${AWS::Partition}:secretsmanager:\${AWS::Region}:\${AWS::AccountId}:secret:kibana/managed-onboarding/\${AWS::StackName}-*"

  KibanaOnboardingAccessKey:
    Type: AWS::IAM::AccessKey
    Properties:
      UserName: !Ref KibanaOnboardingUser

  # The key pair lives only here. Read it once with Secrets Manager (console or
  # \`aws secretsmanager get-secret-value\`) and paste it into Kibana, which stores it encrypted.
  KibanaOnboardingSecret:
    Type: AWS::SecretsManager::Secret
    Properties:
      Name: !Sub "kibana/managed-onboarding/\${AWS::StackName}"
      Description: Access key for Kibana-managed AWS onboarding (POC). Rotate or delete with the stack.
      SecretString: !Sub
        - '{"accessKeyId":"\${KeyId}","secretAccessKey":"\${Secret}","region":"\${AWS::Region}","stackNamePrefix":"\${StackNamePrefix}","bootstrapStackId":"\${AWS::StackId}"}'
        - KeyId: !Ref KibanaOnboardingAccessKey
          Secret: !GetAtt KibanaOnboardingAccessKey.SecretAccessKey

Outputs:
  SecretArn:
    Description: Secrets Manager secret holding the access key to paste into Kibana. The key itself is not an output.
    Value: !Ref KibanaOnboardingSecret
  StackNamePrefix:
    Value: !Ref StackNamePrefix
  BootstrapStackId:
    Description: Paste into Kibana as the bootstrap stack ARN so that removing the credentials also deletes this stack.
    Value: !Ref AWS::StackId
`;
