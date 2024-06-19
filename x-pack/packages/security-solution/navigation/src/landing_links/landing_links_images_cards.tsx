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
  EuiFlexItem,
  EuiIcon,
  EuiImage,
  EuiPanel,
  EuiTitle,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import React from 'react';
import { css } from '@emotion/react';
import * as i18n from './translations';
import { withLink } from '../links';
import type { NavigationLink } from '../types';
import { BetaBadge } from './beta_badge';
import { getKibanaLinkProps } from './utils';

export interface LandingLinksImagesProps {
  items: NavigationLink[];
  urlState?: string;
  onLinkClick?: (id: string) => void;
}

const CARD_HEIGHT = 116;

const useStyles = () => {
  const { euiTheme } = useEuiTheme();
  return {
    card: css`
      // Needed to use the primary color in the title underlining on hover
      .euiCard__title {
        color: ${euiTheme.colors.primaryText};
      }
      height: ${CARD_HEIGHT}px;
      display: flex;
      justify-content: flex-start;
    `,
    cardWrapper: css`
      height: 100%;
    `,
    titleContainer: css`
      display: flex;
      align-items: center;
      height: 24px;
    `,
    title: css`
      color: ${euiTheme.colors.primaryText};
      font-weight: ${euiTheme.font.weight.semiBold};
    `,
    description: css`
      padding-top: ${euiTheme.size.xs};
      max-width: 550px;
      font-size: 12px;
    `,
    cardsContainer: css`
      padding-top: 16px;
      gap: ${euiTheme.size.s};
    `,
    imageContainer: css`
      overflow: hidden;
      height: 100%;
      width: calc(${CARD_HEIGHT}px - 16px);
      flex-grow: 0;
    `,
    cardInfoContainer: css`
      width: min-content;
    `,
    image: css`
      max-inline-size: none;
      overflow: hidden;
      height: calc(${CARD_HEIGHT}px - 16px);
    `,
  };
};

const EuiPanelWithLink = withLink(EuiPanel);

export const LandingLinksImageCards: React.FC<LandingLinksImagesProps> = React.memo(
  function LandingLinksImageCards({ items, urlState, onLinkClick }) {
    const simpleAccordionId = useGeneratedHtmlId({ prefix: 'simpleAccordion' });
    const styles = useStyles();
    return (
      <EuiPanel hasShadow={false} color="subdued" borderRadius="m" paddingSize="m">
        <EuiAccordion
          id={simpleAccordionId}
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
              const linkProps = getKibanaLinkProps({ item, urlState, onLinkClick });
              const { id, landingImage, title, description, isBeta, betaOptions } = item;
              return (
                <EuiFlexItem key={id} data-test-subj="LandingImageCard-item" grow={false}>
                  <EuiPanelWithLink {...linkProps} hasBorder paddingSize="xs" css={styles.card}>
                    <EuiFlexGroup
                      gutterSize="s"
                      direction="row"
                      wrap
                      justifyContent="flexStart"
                      alignItems="flexStart"
                      css={styles.cardWrapper}
                    >
                      {landingImage && (
                        <EuiPanel
                          paddingSize="none"
                          hasShadow={false}
                          hasBorder
                          borderRadius="m"
                          css={styles.imageContainer}
                        >
                          <EuiImage
                            data-test-subj="LandingImageCard-image"
                            role="presentation"
                            alt={title}
                            src={landingImage}
                            css={styles.image}
                          />
                        </EuiPanel>
                      )}
                      <EuiFlexGroup
                        css={styles.cardInfoContainer}
                        gutterSize="s"
                        direction="column"
                      >
                        <div css={styles.titleContainer}>
                          <EuiTitle size="xxxs" css={styles.title}>
                            <h3>{title}</h3>
                          </EuiTitle>
                          {isBeta && <BetaBadge text={betaOptions?.text} />}
                        </div>
                        <span css={styles.description}>{description}</span>
                      </EuiFlexGroup>
                    </EuiFlexGroup>
                  </EuiPanelWithLink>
                </EuiFlexItem>
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
