/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScrollToAttachmentTarget } from '../../hooks/use_conversation_scroll_actions';
import { searchParamNames } from '../../search_param_names';

/** Reads the inline attachment to scroll to from a location's search string, if any. */
export const parseScrollToAttachment = (search: string): ScrollToAttachmentTarget | undefined => {
  const params = new URLSearchParams(search);
  const id = params.get(searchParamNames.scrollToAttachmentId);
  if (!id) {
    return undefined;
  }
  const rawVersion = params.get(searchParamNames.scrollToAttachmentVersion);
  const version = rawVersion ? Number(rawVersion) : NaN;
  return Number.isInteger(version) ? { id, version } : { id };
};

/** Returns the search string without the scroll-to-attachment params, keeping all others. */
export const removeScrollToAttachment = (search: string): string => {
  const params = new URLSearchParams(search);
  params.delete(searchParamNames.scrollToAttachmentId);
  params.delete(searchParamNames.scrollToAttachmentVersion);
  return params.toString();
};
