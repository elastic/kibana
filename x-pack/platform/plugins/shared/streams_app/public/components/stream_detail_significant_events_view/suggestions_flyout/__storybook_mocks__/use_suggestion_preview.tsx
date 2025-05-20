/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import suggestionPreviews from '../mock_suggestion_previews.json';

export const previews = suggestionPreviews.map(({ ...rest }) => ({
  ...rest,
  // put back an icon placeholder
  annotations: rest.annotations.map((annotation) => ({ ...annotation, icon: <></> })),
}));

export function useSignificantEventSuggestionPreviews() {
  return previews;
}
