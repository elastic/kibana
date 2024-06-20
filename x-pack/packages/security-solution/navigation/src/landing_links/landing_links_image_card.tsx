/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexItem, EuiImage, EuiPanel, EuiTitle, useEuiTheme } from '@elastic/eui';
import React from 'react';
import { css } from '@emotion/react';
import { withLink } from '../links';
import type { NavigationLink } from '../types';
import { BetaBadge } from './beta_badge';
import { getKibanaLinkProps } from './utils';

export interface LandingLinksImageCardProps {
  item: NavigationLink;
  urlState?: string;
  onLinkClick?: (id: string) => void;
}

const CARD_HEIGHT = 116;
const CARD_HEIGHT_IMAGE = 106;

const useStyles = () => {
  const { euiTheme } = useEuiTheme();
  return {
    card: css`
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
      height: ${euiTheme.size.l};
    `,
    title: css`
      color: ${euiTheme.colors.primaryText};
      font-weight: ${euiTheme.font.weight.semiBold};
    `,
    description: css`
      padding-top: ${euiTheme.size.xs};
      max-width: 550px;
      font-size: ${euiTheme.size.m};
    `,
    imageContainer: css`
      overflow: hidden;
      height: 100%;
      width: ${CARD_HEIGHT_IMAGE}px;
      flex-grow: 0;
    `,
    cardInfoContainer: css`
      width: min-content;
    `,
    image: css`
      max-inline-size: none;
      overflow: hidden;
      height: ${CARD_HEIGHT_IMAGE}px;
    `,
  };
};

const EuiPanelWithLink = withLink(EuiPanel);

export const LandingLinksImageCard: React.FC<LandingLinksImageCardProps> = React.memo(
  function LandingLinksImageCard({ item, urlState, onLinkClick }) {
    const styles = useStyles();

    const linkProps = getKibanaLinkProps({ item, urlState, onLinkClick });
    const { landingImage, title, description, isBeta, betaOptions } = item;
    return (
      <EuiFlexItem data-test-subj="LandingImageCard-item" grow={false}>
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
                  alt={title}
                  src={landingImage}
                  css={styles.image}
                />
              </EuiPanel>
            )}
            <EuiFlexGroup css={styles.cardInfoContainer} gutterSize="s" direction="column">
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
  }
);

// eslint-disable-next-line import/no-default-export
export default LandingLinksImageCard;
