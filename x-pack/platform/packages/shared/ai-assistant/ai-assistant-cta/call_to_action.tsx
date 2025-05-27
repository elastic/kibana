/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ReactNode } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiPanelProps,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

import { AssistantBeacon, AssistantBeaconProps, useBeaconSize } from '@kbn/ai-assistant-icon';

import { styles } from './call_to_action.styles';
import { translations } from './call_to_action.translations';

const Beacon = (props: Pick<AssistantBeaconProps, 'backgroundColor'>) => (
  <EuiFlexItem grow={false}>
    <AssistantBeacon {...props} size="xxl" />
  </EuiFlexItem>
);

const Title = ({ title }: Pick<AssistantCallToActionProps, 'title'>) => (
  <EuiFlexItem grow={false}>
    <EuiTitle>
      <h2>{title}</h2>
    </EuiTitle>
  </EuiFlexItem>
);

const Description = ({ description }: Pick<AssistantCallToActionProps, 'description'>) => {
  if (!description) {
    return null;
  }

  return (
    <EuiFlexItem grow={false}>
      <EuiText size="m" color="subdued" textAlign="center">
        {description}
      </EuiText>
    </EuiFlexItem>
  );
};

const Actions = ({ children }: Pick<AssistantCallToActionProps, 'children'>) => {
  if (!children) {
    return null;
  }

  return <EuiFlexItem css={styles.actions}>{children}</EuiFlexItem>;
};

/** Props for the `AssistantCallToAction` */
export interface AssistantCallToActionProps {
  /** Background color of the panel. Needed to ensure the `AssistantBeacon` blends properly with the page.  Defaults to `plain`. */
  color?: Extract<EuiPanelProps['color'], 'plain' | 'subdued'>;
  /** A title, appearing below the beacon.  Defaults to a generic welcome message. */
  title?: string;
  /** Optional description for the call to action. */
  description?: string;
  /**
   * True if the panel is intended to be vertically centered, false otherwise.  If true, the panel will compensate for the
   * beacon height to ensure the title and description are centered.
   */
  centered?: boolean;
  /** Optional content to display beneath the description. */
  children?: ReactNode;
  /** Optional test subject for the component. */
  ['data-test-subj']?: string;
}

/**
 * A "Call to Action" panel for use in the AI Assistant.  Comprises a title, description, and children.
 *
 * This is a base component that can be used to create more specific calls to action, (e.g. install knowledge base).
 */
export const AssistantCallToAction = ({
  title = translations.title,
  description,
  color = 'plain',
  children,
  centered = false,
  ...props
}: AssistantCallToActionProps) => {
  const { rootSize } = useBeaconSize('xxl');
  const backgroundColor = color === 'plain' ? 'backgroundBasePlain' : 'backgroundBaseSubdued';

  return (
    <EuiPanel
      css={styles.root(centered ? rootSize : 0)}
      hasShadow={false}
      borderRadius="none"
      grow={false}
      {...{ color, ...props }}
    >
      <EuiFlexGroup direction="column" alignItems="center" gutterSize="m">
        <Beacon {...{ backgroundColor }} />
        <Title {...{ title }} />
        <Description {...{ description }} />
        <Actions>{children}</Actions>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
