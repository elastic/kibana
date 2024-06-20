/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiAccordion,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiIcon,
  EuiPanel,
  EuiTitle,
  useEuiTheme,
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
  const { euiTheme } = useEuiTheme();
  return {
    cardsContainer: css`
      padding-top: 16px;
      gap: ${euiTheme.size.s};
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
          data-test-subj="LandingImageCards-accordion"
          buttonContent={
            <EuiFlexGroup
              gutterSize="xs"
              direction="row"
              justifyContent="flexStart"
              alignItems="center"
            >
              <EuiIcon type="logoSecurity" />
              <EuiTitle size="xxs">
                <h2>{i18n.LANDING_LINKS_ACCORDION_HEADER}</h2>
              </EuiTitle>
            </EuiFlexGroup>
          }
        >
          <EuiFlexGrid css={styles.cardsContainer} columns={3}>
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
          </EuiFlexGrid>
        </EuiAccordion>
      </EuiPanel>
    );
  }
);

// eslint-disable-next-line import/no-default-export
export default LandingLinksImageCards;
