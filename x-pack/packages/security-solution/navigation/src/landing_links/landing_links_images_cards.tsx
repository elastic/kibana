/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiCard, EuiFlexGroup, EuiFlexItem, EuiImage, EuiTitle, useEuiTheme } from '@elastic/eui';
import React from 'react';
import { css } from '@emotion/react';
import { withLink } from '../links';
import type { NavigationLink } from '../types';
import { BetaBadge } from './beta_badge';
import { getKibanaLinkProps } from './utils';

export interface LandingLinksImagesProps {
  items: NavigationLink[];
  urlState?: string;
  onLinkClick?: (id: string) => void;
}

const CARD_WIDTH = 320;

const useStyles = () => {
  const { euiTheme } = useEuiTheme();
  return {
    container: css`
      max-width: ${CARD_WIDTH}px;
    `,
    card: css`
      // Needed to use the primary color in the title underlining on hover
      .euiCard__title {
        color: ${euiTheme.colors.primaryText};
      }
    `,
    titleContainer: css`
      display: flex;
      align-items: center;
    `,
    title: css`
      color: ${euiTheme.colors.primaryText};
    `,
    description: css`
      padding-top: ${euiTheme.size.xs};
      max-width: 550px;
    `,
  };
};

const EuiCardWithLink = withLink(EuiCard);

export const LandingLinksImageCards: React.FC<LandingLinksImagesProps> = React.memo(
  function LandingLinksImageCards({ items, urlState, onLinkClick }) {
    const styles = useStyles();
    return (
      <EuiFlexGroup direction="row" wrap data-test-subj="LandingImageCards">
        {items.map((item) => {
          const linkProps = getKibanaLinkProps({ item, urlState, onLinkClick });
          const { id, landingImage, title, description, isBeta, betaOptions } = item;
          return (
            <EuiFlexItem
              key={id}
              data-test-subj="LandingImageCard-item"
              grow={false}
              css={styles.container}
            >
              <EuiCardWithLink
                {...linkProps}
                hasBorder
                textAlign="left"
                paddingSize="m"
                css={styles.card}
                image={
                  landingImage && (
                    <EuiImage
                      data-test-subj="LandingImageCard-image"
                      role="presentation"
                      size={CARD_WIDTH}
                      alt={title}
                      src={landingImage}
                    />
                  )
                }
                title={
                  <div css={styles.titleContainer}>
                    <EuiTitle size="xs" css={styles.title}>
                      <h2>{title}</h2>
                    </EuiTitle>
                    {isBeta && <BetaBadge text={betaOptions?.text} />}
                  </div>
                }
                titleElement="span"
                description={<span css={styles.description}>{description}</span>}
              />
            </EuiFlexItem>
          );
        })}
      </EuiFlexGroup>
    );
  }
);

// eslint-disable-next-line import/no-default-export
export default LandingLinksImageCards;
