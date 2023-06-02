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
      'Welcome to your Elastic Assistant! I am your [100% open-code](https://github.com/elastic/kibana/pull/156933) portal into your Elastic Life. In time, I will be able to answer questions and provide assistance over all your information in Elastic, and oh-so much more. Till then, I hope this early preview will open your minds to the possibilities of what we can create when we work together, in the open. Cheers!',
  }
);

export const WELCOME_GENERAL_2 = i18n.translate(
  'xpack.elasticAssistant.securityAssistant.content.prompts.welcome.welcomeGeneral2Prompt',
  {
    defaultMessage:
      "So first things first, we'll need to set up a `Generative AI Connector` to get this chat experience going! With the `Generative AI Connector` you'll be able to configure access to either an [`Azure OpenAI Service`](https://azure.microsoft.com/en-us/products/cognitive-services/openai-service) or [`OpenAI API`](https://platform.openai.com/) account, but you better believe you'll be able to [deploy _your own_ models within your Elastic Cloud instance](https://www.elastic.co/blog/may-2023-launch-announcement) and use those here in the future... 😉",
  }
);

export const WELCOME_GENERAL_3 = i18n.translate(
  'xpack.elasticAssistant.securityAssistant.content.prompts.welcome.welcomeGeneral3Prompt',
  {
    defaultMessage:
      'Go ahead and click the add connector button below, or just press the `space-bar` for that quick action! 💨',
  }
);
