/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import React from 'react';

import type { ComponentTemplateListItem } from '../../../../../common';
import type { Props as ComponentTemplatesListItemProps } from './component_templates_list_item';
import { ComponentTemplatesListItem } from './component_templates_list_item';

const listStyles = css`
  width: 100%;
`;

interface Props {
  components: ComponentTemplateListItem[];
  listItemProps: Omit<ComponentTemplatesListItemProps, 'component'>;
}

export const ComponentTemplatesList = ({ components, listItemProps }: Props) => {
  return (
    <div css={listStyles} data-test-subj="componentTemplatesList">
      {components.map((component) => (
        <ComponentTemplatesListItem key={component.name} component={component} {...listItemProps} />
      ))}
    </div>
  );
};
