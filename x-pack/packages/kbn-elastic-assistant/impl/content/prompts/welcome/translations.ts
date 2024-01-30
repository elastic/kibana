/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const WELCOME_GENERAL = i18n.translate(
  'xpack.elasticAssistant.securityAssistant.content.prompts.welcome.welcomeGeneralPrompt',
  {
    defaultMessage:
      'Welcome to your Elastic AI Assistant! I am your 100% open-code portal into your Elastic life. In time, I will be able to answer questions and provide assistance across all your information in Elastic, and oh-so much more. Till then, I hope this early preview will open your mind to the possibilities of what we can create when we work together, in the open. Cheers!',
  }
);

export const WELCOME_GENERAL_2 = i18n.translate(
  'xpack.elasticAssistant.securityAssistant.content.prompts.welcome.welcomeGeneral2Prompt',
  {
    defaultMessage:
      "First things first, we'll need to set up a Generative AI Connector to get this chat experience going! With the Generative AI Connector, you'll be able to configure access to either an OpenAI service or an Amazon Bedrock service, but you better believe you'll be able to deploy your own models within your Elastic Cloud instance and use those here in the future... 😉",
  }
);

export const WELCOME_GENERAL_3 = i18n.translate(
  'xpack.elasticAssistant.securityAssistant.content.prompts.welcome.welcomeGeneral3Prompt',
  {
    defaultMessage:
      'Go ahead and click the add connector button below to continue the conversation!',
  }
);

export const ENTERPRISE = i18n.translate(
  'xpack.elasticAssistant.securityAssistant.content.prompts.welcome.enterprisePrompt',
  {
    defaultMessage:
      'Elastic AI Assistant is available to Enterprise users only. Please upgrade your license to use this feature.',
  }
);
