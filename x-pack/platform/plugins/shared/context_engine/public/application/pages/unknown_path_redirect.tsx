/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Redirect, useParams } from 'react-router-dom';
import { CONTEXT_ENGINE_PATHS, getAiIndexDetailPath } from '../paths';

/** Sends an unknown path under an AI index to that AI index, so the page is never blank. */
export const AiIndexUnknownPathRedirect = () => {
  const { id = '' } = useParams<{ id: string }>();
  return <Redirect to={getAiIndexDetailPath(id)} />;
};

/** Sends any other unknown path to the Context Engine landing page. */
export const UnknownPathRedirect = () => <Redirect to={CONTEXT_ENGINE_PATHS.landing} />;
