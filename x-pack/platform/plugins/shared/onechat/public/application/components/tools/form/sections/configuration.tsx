/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { docLinks } from '../../../../../../common/doc_links';
import { ToolFormSection } from '../components/tool_form_section';
import { i18nMessages } from '../i18n';
import type { ToolFormData } from '../types/tool_form_types';
import { getToolTypeConfig } from '../registry/tools_form_registry';

export const Configuration = () => {
  const { control } = useFormContext<ToolFormData>();
  const type = useWatch({ control, name: 'type' });
  const toolConfig = getToolTypeConfig(type);
  const ConfigurationComponent = useMemo(() => {
    return toolConfig!.getConfigurationComponent();
  }, [toolConfig]);

  return (
    <ToolFormSection
      title={i18nMessages.configuration.documentation.title}
      icon="code"
      description={i18nMessages.configuration.documentation.description}
      documentation={{
        title: i18nMessages.configuration.documentation.documentationLink,
        href: docLinks.tools,
      }}
    >
      <ConfigurationComponent />
    </ToolFormSection>
  );
};
