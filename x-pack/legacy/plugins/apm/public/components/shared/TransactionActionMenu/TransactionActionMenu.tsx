/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButtonEmpty } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { FunctionComponent, useState } from 'react';
import {
  ActionMenu,
  ActionMenuDivider,
  Section,
  SectionLink,
  SectionLinks,
  SectionSubtitle,
  SectionTitle
} from '../../../../../../../plugins/observability/public';
import { Transaction } from '../../../../typings/es_schemas/ui/Transaction';
import { useApmPluginContext } from '../../../hooks/useApmPluginContext';
import { useLocation } from '../../../hooks/useLocation';
import { useUrlParams } from '../../../hooks/useUrlParams';
import { getSections } from './sections';

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
  const { core } = useApmPluginContext();
  const location = useLocation();
  const { urlParams } = useUrlParams();

  const [isOpen, setIsOpen] = useState(false);

  const sections = getSections({
    transaction,
    basePath: core.http.basePath,
    location,
    urlParams
  });

  return (
    <ActionMenu
      id="transactionActionMenu"
      closePopover={() => setIsOpen(false)}
      isOpen={isOpen}
      anchorPosition="downRight"
      button={<ActionMenuButton onClick={() => setIsOpen(!isOpen)} />}
    >
      {sections.map((section, idx) => {
        const isLastSection = idx !== sections.length - 1;
        return (
          <div key={idx}>
            {section.map(item => (
              <Section key={item.key}>
                {item.title && <SectionTitle>{item.title}</SectionTitle>}
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
    </ActionMenu>
  );
};
