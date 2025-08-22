/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect } from 'react';

import { useCreateFromTemplate, useFindTemplates } from '../hooks';

import { WorkpadTemplates as Component } from './workpad_templates.component';
import type { CanvasTemplate } from '../../../../types';
import { Loading } from '../loading';

export const WorkpadTemplates = () => {
  const findTemplates = useFindTemplates();
  const [isMounted, setIsMounted] = useState(false);
  const [templates, setTemplates] = useState<CanvasTemplate[]>([]);

  useEffect(() => {
    const mount = async () => {
      const response = await findTemplates();
      setIsMounted(true);
      setTemplates(response?.templates || []);
    };
    mount();
  }, [setIsMounted, findTemplates]);

  const onCreateWorkpad = useCreateFromTemplate();

  if (!isMounted) {
    return <Loading />;
  }

  return <Component {...{ templates, onCreateWorkpad }} />;
};

// required for dynamic import using React.lazy()
// eslint-disable-next-line import/no-default-export
export default WorkpadTemplates;
