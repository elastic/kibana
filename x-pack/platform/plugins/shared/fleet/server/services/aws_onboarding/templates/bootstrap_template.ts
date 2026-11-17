/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const BOOTSTRAP_TEMPLATE_FILENAME = 'kibana-managed-onboarding-bootstrap.yml';

/**
 * The IaCP blueprint is the source of truth for this template. This is the fallback copy served
 * when the provisioner cannot render it, kept in sync by hand with the YAML next to it.
 */
export const BOOTSTRAP_TEMPLATE_YAML = `AWSTemplateFormatVersion: "2010-09-09"
Description: >-
  POC ONLY. One-time bootstrap for Kibana-managed AWS onboarding, shaped like AWS IAM temporary
  delegation: Kibana holds an identity that can do nothing except assume two scoped roles for a
  short session, one at a time, per operation. The discovery role is read-only (which services
  exist, what to pre-fill). The provisioning role creates and updates the Elastic Federated
  Identity CloudFormation stacks named <StackNamePrefix>-* and is only created in fully-managed
  mode. The access key is written to AWS Secrets Manager; nothing sensitive is a stack output.
  When delegation is available the stored key is replaced by a delegated session token and the
  roles stay as they are.

Parameters:
  StackNamePrefix:
    Type: String
    Default: elastic-onboarding
    AllowedPattern: "^[a-zA-Z][a-zA-Z0-9-]{0,39}$"
    Description: Kibana may only manage CloudFormation stacks whose names start with this prefix.
  ManagementMode:
    Type: String
    Default: fully-managed
    AllowedValues:
      - fully-managed
      - partially-managed
    Description: >-
      fully-managed lets Kibana discover services and create/update the Federated Identity stack.
      partially-managed is read-only: Kibana discovers and pre-fills, you deploy the stack yourself.

Conditions:
  IsFullyManaged: !Equals [!Ref ManagementMode, fully-managed]

Resources:
  # Read-only: service discovery and settings pre-fill.
  KibanaOnboardingDiscoveryRole:
    Type: AWS::IAM::Role
    Properties:
      RoleName: !Sub "KibanaOnboardingDiscovery-\${AWS::StackName}"
      MaxSessionDuration: 3600
      AssumeRolePolicyDocument:
        Version: "2012-10-17"
        Statement:
          - Effect: Allow
            Principal:
              AWS: !GetAtt KibanaOnboardingUser.Arn
            Action: sts:AssumeRole
      ManagedPolicyArns:
        - !Sub "arn:\${AWS::Partition}:iam::aws:policy/job-function/ViewOnlyAccess"
      Policies:
        - PolicyName: ServicesInUse
          PolicyDocument:
            Version: "2012-10-17"
            Statement:
              - Sid: CostExplorerServiceList
                Effect: Allow
                Action:
                  - ce:GetDimensionValues
                  - ce:GetCostAndUsage
                Resource: "*"
              - Sid: GuardDutyDiscovery
                Effect: Allow
                Action:
                  - guardduty:ListDetectors
                  - guardduty:GetDetector
                Resource: "*"

  # Read-write: create and update the Federated Identity stacks. Fully-managed mode only.
  KibanaOnboardingProvisioningRole:
    Type: AWS::IAM::Role
    Condition: IsFullyManaged
    Properties:
      RoleName: !Sub "KibanaOnboardingProvisioning-\${AWS::StackName}"
      MaxSessionDuration: 3600
      AssumeRolePolicyDocument:
        Version: "2012-10-17"
        Statement:
          - Effect: Allow
            Principal:
              AWS: !GetAtt KibanaOnboardingUser.Arn
            Action: sts:AssumeRole
      Policies:
        - PolicyName: ManageFederatedIdentityStacks
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
                  - iam:TagRole
                  - iam:UntagRole
                Resource:
                  - !Sub "arn:\${AWS::Partition}:iam::\${AWS::AccountId}:role/ElasticWorkloadIdentity*"
                  - !Sub "arn:\${AWS::Partition}:iam::\${AWS::AccountId}:role/\${StackNamePrefix}-*"
              - Sid: AttachLambdaExecutionPolicyOnly
                Effect: Allow
                Action:
                  - iam:AttachRolePolicy
                  - iam:DetachRolePolicy
                Resource:
                  - !Sub "arn:\${AWS::Partition}:iam::\${AWS::AccountId}:role/ElasticWorkloadIdentity*"
                  - !Sub "arn:\${AWS::Partition}:iam::\${AWS::AccountId}:role/\${StackNamePrefix}-*"
                Condition:
                  ArnEquals:
                    iam:PolicyARN: !Sub "arn:\${AWS::Partition}:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
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
              - Sid: ManageFunctionLogGroup
                Effect: Allow
                Action:
                  - logs:CreateLogGroup
                  - logs:DeleteLogGroup
                  - logs:PutRetentionPolicy
                  - logs:DeleteRetentionPolicy
                  - logs:TagResource
                  - logs:UntagResource
                  - logs:ListTagsForResource
                Resource: !Sub "arn:\${AWS::Partition}:logs:*:\${AWS::AccountId}:log-group:\${StackNamePrefix}-*"
              - Sid: DescribeLogGroups
                Effect: Allow
                Action: logs:DescribeLogGroups
                Resource: "*"

  # The identity Kibana holds. It can only assume the roles above (the stand-in for a delegated
  # session) and clean this stack up when the credentials are removed from Kibana. Inline
  # permissions last until the user itself is deleted, which is the final step of the teardown.
  KibanaOnboardingUser:
    Type: AWS::IAM::User
    Properties:
      UserName: !Sub "kibana-managed-onboarding-\${AWS::StackName}"
      Policies:
        - PolicyName: AssumeOnboardingRoles
          PolicyDocument:
            Version: "2012-10-17"
            Statement:
              - Sid: AssumeScopedRoles
                Effect: Allow
                Action: sts:AssumeRole
                Resource:
                  - !Sub "arn:\${AWS::Partition}:iam::\${AWS::AccountId}:role/KibanaOnboardingDiscovery-\${AWS::StackName}"
                  - !Sub "arn:\${AWS::Partition}:iam::\${AWS::AccountId}:role/KibanaOnboardingProvisioning-\${AWS::StackName}"
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
              - Sid: DeleteOnboardingRoles
                Effect: Allow
                Action:
                  - iam:DeleteRole
                  - iam:DeleteRolePolicy
                  - iam:DetachRolePolicy
                  - iam:ListRolePolicies
                  - iam:ListAttachedRolePolicies
                  - iam:ListInstanceProfilesForRole
                Resource:
                  - !Sub "arn:\${AWS::Partition}:iam::\${AWS::AccountId}:role/KibanaOnboardingDiscovery-\${AWS::StackName}"
                  - !Sub "arn:\${AWS::Partition}:iam::\${AWS::AccountId}:role/KibanaOnboardingProvisioning-\${AWS::StackName}"
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

  # Everything Kibana needs lives here. Read it once with Secrets Manager (console or
  # \`aws secretsmanager get-secret-value\`) and paste the JSON into Kibana, which stores it encrypted.
  KibanaOnboardingSecret:
    Type: AWS::SecretsManager::Secret
    Properties:
      Name: !Sub "kibana/managed-onboarding/\${AWS::StackName}"
      Description: Access key and role ARNs for Kibana-managed AWS onboarding (POC). Rotate or delete with the stack.
      SecretString: !Sub
        - '{"accessKeyId":"\${KeyId}","secretAccessKey":"\${Secret}","region":"\${AWS::Region}","stackNamePrefix":"\${StackNamePrefix}","bootstrapStackArn":"\${AWS::StackId}","discoveryRoleArn":"\${DiscoveryRole}","provisioningRoleArn":"\${ProvisioningRole}"}'
        - KeyId: !Ref KibanaOnboardingAccessKey
          Secret: !GetAtt KibanaOnboardingAccessKey.SecretAccessKey
          DiscoveryRole: !GetAtt KibanaOnboardingDiscoveryRole.Arn
          ProvisioningRole: !If [IsFullyManaged, !GetAtt KibanaOnboardingProvisioningRole.Arn, ""]

Outputs:
  SecretArn:
    Description: Secrets Manager secret holding the JSON to paste into Kibana. The key itself is not an output.
    Value: !Ref KibanaOnboardingSecret
  ManagementMode:
    Value: !Ref ManagementMode
  StackNamePrefix:
    Value: !Ref StackNamePrefix
  DiscoveryRoleArn:
    Value: !GetAtt KibanaOnboardingDiscoveryRole.Arn
  ProvisioningRoleArn:
    Value: !If [IsFullyManaged, !GetAtt KibanaOnboardingProvisioningRole.Arn, "not created (partially-managed)"]
  BootstrapStackId:
    Description: Also in the secret JSON; lets Kibana delete this stack when the credentials are removed.
    Value: !Ref AWS::StackId
`;
