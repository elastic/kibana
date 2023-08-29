/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiImage,
  EuiPanel,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import React from 'react';
import { css } from '@emotion/react';
import { LinkAnchor } from '../links';
import type { NavigationLink } from '../types';
import { BetaBadge } from './beta_badge';
import { getKibanaLinkProps } from './utils';

const noop = () => {};
export interface LandingLinksImagesProps {
  items: NavigationLink[];
  urlState?: string;
  onLinkClick?: (id: string) => void;
}

const useStyles = () => {
  const { euiTheme } = useEuiTheme();
  return {
    link: css`
      color: inherit;
      &:hover {
        text-decoration: none;
      }
    `,
    image: css`
      align-items: center;
    `,
    content: css`
      padding-left: ${euiTheme.size.s};
    `,
    titleContainer: css`
      display: flex;
      align-items: center;
    `,
    title: css`
      color: ${euiTheme.colors.primaryText};
      align-items: center;
    `,
    description: css`
      padding-top: ${euiTheme.size.xs};
      max-width: 550px;
    `,
  };
};

export const LandingLinksImages: React.FC<LandingLinksImagesProps> = React.memo(
  function LandingLinksImages({ items, urlState, onLinkClick }) {
    const styles = useStyles();
    return (
      <EuiFlexGroup direction="column">
        {items.map((item) => {
          const linkProps = getKibanaLinkProps({ item, urlState, onLinkClick });
          const { id, title, description, landingImage, isBeta, betaOptions } = item;
          return (
            <EuiFlexItem key={id} data-test-subj="LandingItem">
              <LinkAnchor {...linkProps} tabIndex={-1} css={styles.link}>
                {/* Empty onClick is to force hover style on `EuiPanel` */}
                <EuiPanel hasBorder hasShadow={false} paddingSize="m" onClick={noop}>
                  <EuiFlexGroup>
                    <EuiFlexItem grow={false} css={styles.image}>
                      {landingImage && (
                        <EuiImage
                          data-test-subj="LandingLinksImage"
                          size="l"
                          role="presentation"
                          alt=""
                          src={landingImage}
                        />
                      )}
                    </EuiFlexItem>
                    <EuiFlexItem css={styles.content}>
                      <div css={styles.titleContainer}>
                        <EuiTitle size="s" css={styles.title}>
                          <h2>{title}</h2>
                        </EuiTitle>
                        {isBeta && <BetaBadge text={betaOptions?.text} />}
                      </div>
                      <EuiText size="s" color="text" css={styles.description}>
                        {description}
                      </EuiText>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiPanel>
              </LinkAnchor>
            </EuiFlexItem>
          );
        })}
      </EuiFlexGroup>
    );
  }
);

// eslint-disable-next-line import/no-default-export
export default LandingLinksImages;
