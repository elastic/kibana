/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiAccordion,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import React from 'react';
import { css } from '@emotion/react';
import * as i18n from './translations';
import type { NavigationLink } from '../types';
import LandingLinksImageCard from './landing_links_image_card';

export interface LandingLinksImagesProps {
  items: NavigationLink[];
  urlState?: string;
  onLinkClick?: (id: string) => void;
}

const useStyles = () => {
  return {
    accordion: css`
      .euiAccordion__childWrapper {
        overflow: visible;
      }
    `,
  };
};

export const LandingLinksImageCards: React.FC<LandingLinksImagesProps> = React.memo(
  function LandingLinksImageCards({ items, urlState, onLinkClick }) {
    const landingLinksAccordionId = useGeneratedHtmlId({ prefix: 'landingLinksAccordion' });
    const styles = useStyles();

    return (
      <EuiPanel hasShadow={false} color="subdued" borderRadius="m" paddingSize="m">
        <EuiAccordion
          id={landingLinksAccordionId}
          initialIsOpen
          css={styles.accordion}
          data-test-subj="LandingImageCards-accordion"
          buttonContent={
            <EuiFlexGroup
              gutterSize="xs"
              direction="row"
              justifyContent="flexStart"
              alignItems="center"
              data-test-subj="LandingImageCards-accordionButton"
            >
              <EuiFlexItem grow={false}>
                <EuiIcon type="logoSecurity" />
              </EuiFlexItem>

              <EuiFlexItem grow={false}>
                <EuiTitle size="xxs">
                  <h2>{i18n.LANDING_LINKS_ACCORDION_HEADER}</h2>
                </EuiTitle>
              </EuiFlexItem>
            </EuiFlexGroup>
          }
        >
          <EuiSpacer size="m" />
          <EuiFlexGroup gutterSize="s" wrap>
            {items.map((item) => {
              const { id } = item;
              return (
                <LandingLinksImageCard
                  item={item}
                  urlState={urlState}
                  onLinkClick={onLinkClick}
                  key={id}
                />
              );
            })}
          </EuiFlexGroup>
        </EuiAccordion>
      </EuiPanel>
    );
  }
);

// eslint-disable-next-line import/no-default-export
export default LandingLinksImageCards;
