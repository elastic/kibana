/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButtonEmpty } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { FunctionComponent, useMemo, useState } from 'react';
import { Filter } from '../../../../../../../plugins/apm/common/custom_link/custom_link_types';
import { Transaction } from '../../../../../../../plugins/apm/typings/es_schemas/ui/transaction';
import {
  ActionMenu,
  ActionMenuDivider,
  Section,
  SectionLink,
  SectionLinks,
  SectionSubtitle,
  SectionTitle
} from '../../../../../../../plugins/observability/public';
import { useApmPluginContext } from '../../../hooks/useApmPluginContext';
import { useFetcher } from '../../../hooks/useFetcher';
import { useLocation } from '../../../hooks/useLocation';
import { useUrlParams } from '../../../hooks/useUrlParams';
import { CustomLinkFlyout } from '../../app/Settings/CustomizeUI/CustomLink/CustomLinkFlyout';
import { CustomLink } from './CustomLink';
import { CustomLinkPopover } from './CustomLink/CustomLinkPopover';
import { getSections } from './sections';
import { useLicense } from '../../../hooks/useLicense';
import { px } from '../../../style/variables';
import { convertFiltersToQuery } from '../../app/Settings/CustomizeUI/CustomLink/CustomLinkFlyout/helper';

interface Props {
  readonly transaction: Transaction;
}

const ActionMenuButton = ({ onClick }: { onClick: () => void }) => (
  <EuiButtonEmpty iconType="arrowDown" iconSide="right" onClick={onClick}>
    {i18n.translate('xpack.apm.transactionActionMenu.actionsButtonLabel', {
      defaultMessage: 'Actions'
    })}
  </EuiButtonEmpty>
);

export const TransactionActionMenu: FunctionComponent<Props> = ({
  transaction
}: Props) => {
  const license = useLicense();
  const hasValidLicense = license?.isActive && license?.hasAtLeast('gold');

  const { core } = useApmPluginContext();
  const location = useLocation();
  const { urlParams } = useUrlParams();

  const [isActionPopoverOpen, setIsActionPopoverOpen] = useState(false);
  const [isCustomLinksPopoverOpen, setIsCustomLinksPopoverOpen] = useState(
    false
  );
  const [isCustomLinkFlyoutOpen, setIsCustomLinkFlyoutOpen] = useState(false);

  const filters = useMemo(
    () =>
      [
        { key: 'service.name', value: transaction?.service.name },
        { key: 'service.environment', value: transaction?.service.environment },
        { key: 'transaction.name', value: transaction?.transaction.name },
        { key: 'transaction.type', value: transaction?.transaction.type }
      ].filter((filter): filter is Filter => typeof filter.value === 'string'),
    [transaction]
  );

  const { data: customLinks = [], status, refetch } = useFetcher(
    callApmApi =>
      callApmApi({
        pathname: '/api/apm/settings/custom_links',
        params: { query: convertFiltersToQuery(filters) }
      }),
    [filters]
  );

  const sections = getSections({
    transaction,
    basePath: core.http.basePath,
    location,
    urlParams
  });

  const closePopover = () => {
    setIsActionPopoverOpen(false);
    setIsCustomLinksPopoverOpen(false);
  };

  const toggleCustomLinkFlyout = () => {
    closePopover();
    setIsCustomLinkFlyoutOpen(isOpen => !isOpen);
  };

  const toggleCustomLinkPopover = () => {
    setIsCustomLinksPopoverOpen(isOpen => !isOpen);
  };

  return (
    <>
      {isCustomLinkFlyoutOpen && (
        <CustomLinkFlyout
          defaults={{ filters }}
          onClose={toggleCustomLinkFlyout}
          onSave={() => {
            toggleCustomLinkFlyout();
            refetch();
          }}
          onDelete={() => {
            toggleCustomLinkFlyout();
            refetch();
          }}
        />
      )}
      <ActionMenu
        id="transactionActionMenu"
        closePopover={closePopover}
        isOpen={isActionPopoverOpen}
        anchorPosition="downRight"
        button={
          <ActionMenuButton onClick={() => setIsActionPopoverOpen(true)} />
        }
      >
        <div style={{ maxHeight: px(600), width: px(335) }}>
          {isCustomLinksPopoverOpen ? (
            <CustomLinkPopover
              customLinks={customLinks.slice(3, customLinks.length)}
              onCreateCustomLinkClick={toggleCustomLinkFlyout}
              onClose={toggleCustomLinkPopover}
              transaction={transaction}
            />
          ) : (
            <>
              {sections.map((section, idx) => {
                const isLastSection = idx !== sections.length - 1;
                return (
                  <div key={idx}>
                    {section.map(item => (
                      <Section key={item.key}>
                        {item.title && (
                          <SectionTitle>{item.title}</SectionTitle>
                        )}
                        {item.subtitle && (
                          <SectionSubtitle>{item.subtitle}</SectionSubtitle>
                        )}
                        <SectionLinks>
                          {item.actions.map(action => (
                            <SectionLink
                              key={action.key}
                              label={action.label}
                              href={action.href}
                            />
                          ))}
                        </SectionLinks>
                      </Section>
                    ))}
                    {isLastSection && <ActionMenuDivider />}
                  </div>
                );
              })}
              {hasValidLicense && (
                <CustomLink
                  customLinks={customLinks}
                  status={status}
                  onCreateCustomLinkClick={toggleCustomLinkFlyout}
                  onSeeMoreClick={toggleCustomLinkPopover}
                  transaction={transaction}
                />
              )}
            </>
          )}
        </div>
      </ActionMenu>
    </>
  );
};
