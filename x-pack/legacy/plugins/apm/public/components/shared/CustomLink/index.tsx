/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  EuiToolTip
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useMemo, useState } from 'react';
import { CustomLink as CustomLinkType } from '../../../../../../../plugins/apm/server/lib/settings/custom_link/custom_link_types';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { FilterOptions } from '../../../../../../../plugins/apm/server/routes/settings/custom_link';
import { Transaction } from '../../../../../../../plugins/apm/typings/es_schemas/ui/transaction';
import {
  Section,
  SectionLink,
  SectionLinks,
  SectionSubtitle
} from '../../../../../../../plugins/observability/public';
import { FETCH_STATUS, useFetcher } from '../../../hooks/useFetcher';
import { px } from '../../../style/variables';
import { CustomLinkFlyout } from '../../app/Settings/CustomizeUI/CustomLink/CustomLinkFlyout';
import { APMLink } from '../Links/apm/APMLink';
import { LoadingStatePrompt } from '../LoadingStatePrompt';
interface Props {
  transaction?: Transaction;
}

export const CustomLink = ({ transaction }: Props) => {
  const [isFlyoutOpen, setIsFlyoutOpen] = useState(false);
  const filters: FilterOptions = useMemo(
    () => ({
      'service.name': transaction?.service.name,
      'service.environment': transaction?.service.environment,
      'transaction.name': transaction?.transaction.name,
      'transaction.type': transaction?.transaction.type
    }),
    [transaction]
  );
  const { data: customLinks = [], status, refetch } = useFetcher(
    callApmApi =>
      callApmApi({
        pathname: '/api/apm/settings/custom_links',
        params: { query: filters }
      }),
    [filters]
  );

  const renderEmptyMessage = () => (
    <>
      <EuiSpacer size="s" />
      <EuiText size="xs" grow={false} style={{ width: px(300) }}>
        {i18n.translate('xpack.apm.customLink.empty', {
          defaultMessage:
            'No custom links found. Set up your own custom links i.e. a link to a specific Dashboard or external link.'
        })}
      </EuiText>
    </>
  );

  const renderLinks = () => (
    <SectionLinks>
      {customLinks.map((link: CustomLinkType) => {
        return (
          <SectionLink
            key={link.id}
            label={link.label}
            href={link.url}
            target="_blank"
          />
        );
      })}
    </SectionLinks>
  );

  const onCloseFlyout = () => {
    setIsFlyoutOpen(false);
  };

  return (
    <>
      {isFlyoutOpen && (
        <CustomLinkFlyout
          customLinkSelected={{ ...filters } as CustomLinkType}
          onClose={onCloseFlyout}
          onSave={() => {
            onCloseFlyout();
            refetch();
          }}
          onDelete={() => {
            onCloseFlyout();
            refetch();
          }}
        />
      )}
      <Section>
        <EuiFlexGroup>
          <EuiFlexItem style={{ justifyContent: 'center' }}>
            <EuiText size={'s'} grow={false}>
              <h5>
                {i18n.translate('xpack.apm.customLink.title', {
                  defaultMessage: 'Custom Links'
                })}
              </h5>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFlexGroup justifyContent="flexEnd" gutterSize="none">
              <EuiFlexItem grow={false}>
                <EuiToolTip
                  position="top"
                  content={i18n.translate(
                    'xpack.apm.customLink.buttom.manage',
                    {
                      defaultMessage: 'Manage custom links'
                    }
                  )}
                >
                  <APMLink path={`/settings/customize-ui`}>
                    <EuiButtonIcon
                      iconType="gear"
                      color="text"
                      aria-label="Custom links settings page"
                    />
                  </APMLink>
                </EuiToolTip>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  iconType="plusInCircle"
                  size="xs"
                  onClick={() => setIsFlyoutOpen(true)}
                >
                  {i18n.translate('xpack.apm.customLink.buttom.create.title', {
                    defaultMessage: 'Create'
                  })}
                </EuiButtonEmpty>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer />
        <SectionSubtitle>
          {i18n.translate('xpack.apm.customLink.subtitle', {
            defaultMessage: 'Links will always open in a new window/tab.'
          })}
        </SectionSubtitle>
        {status === FETCH_STATUS.LOADING ? (
          <LoadingStatePrompt />
        ) : customLinks.length ? (
          renderLinks()
        ) : (
          renderEmptyMessage()
        )}
      </Section>
    </>
  );
};
