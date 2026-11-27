/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { registerDocumentResolver } from '@kbn/custom-app-registry';
import { createCustomContentTemplateResolver } from '@kbn/custom-content-server';
import { resolveCustomContent } from './resolve_custom_content';

type ResolverContext = Parameters<typeof createCustomContentTemplateResolver>[0];

/** Has the templates of custom content components written when an agent makes or changes an app. */
export const registerCustomContentResolver = (): void =>
  registerDocumentResolver<ResolverContext>((document, context) =>
    resolveCustomContent(document, createCustomContentTemplateResolver(context))
  );
