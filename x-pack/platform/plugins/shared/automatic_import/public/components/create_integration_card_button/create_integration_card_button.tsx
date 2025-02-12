/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import {
  EuiLink,
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiImage,
  EuiIcon,
  EuiText,
  EuiTitle,
  useEuiPaddingCSS,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/react';
import integrationsImage from '../../common/images/integrations_light.svg';
import { useKibana } from '../../common/hooks/use_kibana';

const useStyles = (compressed: boolean) => {
  const paddings = useEuiPaddingCSS();
  return {
    image: css`
      width: ${compressed ? '140px' : '160px'};
      height: ${compressed ? '90px' : '155px'};
      object-fit: cover;
      object-position: left center;
    `,
    container: css`
      height: ${compressed ? '80px' : '135px'};
    `,
    textContainer: css`
      height: 100%;
      ${compressed ? `${paddings.m.styles}` : `${paddings.l.styles} padding-right: 0;`}
    `,
  };
};

export interface CreateIntegrationCardButtonProps {
  compressed?: boolean;
}
export const CreateIntegrationCardButton = React.memo<CreateIntegrationCardButtonProps>(
  ({ compressed = false }) => {
    const { getUrlForApp, navigateToUrl } = useKibana().services.application;
    const styles = useStyles(compressed);

    const href = useMemo(() => getUrlForApp('integrations', { path: '/create' }), [getUrlForApp]);
    const navigate = useCallback(
      (ev: React.MouseEvent<HTMLAnchorElement>) => {
        ev.preventDefault();
        navigateToUrl(href);
      },
      [href, navigateToUrl]
    );

    return (
      <EuiPanel hasShadow={false} hasBorder paddingSize="none">
        <EuiFlexGroup
          justifyContent="spaceBetween"
          gutterSize="none"
          css={styles.container}
          responsive={false}
        >
          <EuiFlexItem grow={false}>
            <EuiFlexGroup
              direction="column"
              gutterSize="none"
              justifyContent="spaceBetween"
              css={styles.textContainer}
            >
              <EuiFlexItem>
                <EuiTitle size="xs">
                  <h2>
                    <FormattedMessage
                      id="xpack.automaticImport.createIntegrationTitle"
                      defaultMessage="Can't find an Integration?"
                    />
                  </h2>
                </EuiTitle>
                {!compressed && (
                  <EuiText size="s">
                    <FormattedMessage
                      id="xpack.automaticImport.createIntegrationDescription"
                      defaultMessage="Create a custom one to fit your requirements"
                    />
                  </EuiText>
                )}
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                {/* eslint-disable-next-line @elastic/eui/href-or-on-click */}
                <EuiLink
                  color="primary"
                  href={href}
                  onClick={navigate}
                  data-test-subj="createIntegrationLink"
                >
                  <EuiFlexGroup
                    justifyContent="center"
                    alignItems="center"
                    gutterSize={compressed ? 'xs' : 's'}
                    responsive={false}
                  >
                    <EuiFlexItem grow={false}>
                      <EuiIcon type="plusInCircle" size={compressed ? 's' : 'm'} />
                    </EuiFlexItem>
                    <EuiFlexItem>
                      <FormattedMessage
                        id="xpack.automaticImport.createIntegrationButton"
                        defaultMessage="Create new integration"
                      />
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiLink>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiImage
              alt="create integration background"
              src={integrationsImage}
              css={styles.image}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    );
  }
);
CreateIntegrationCardButton.displayName = 'CreateIntegrationCardButton';
