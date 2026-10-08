/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { awsOnboardingCredentialsService, DEFAULT_STACK_NAME_PREFIX } from './credentials';
export type { AwsOnboardingCredentials } from './credentials';
export { awsOnboardingStackService } from './stacks';
export { isAwsSdkError } from './cloudformation_client';
export {
  BOOTSTRAP_TEMPLATE_YAML,
  BOOTSTRAP_TEMPLATE_FILENAME,
} from './templates/bootstrap_template';
