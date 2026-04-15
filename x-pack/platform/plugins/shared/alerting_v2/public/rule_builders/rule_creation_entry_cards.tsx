/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { EuiCard, EuiFlexGrid, EuiFlexItem, EuiIcon, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

const verticalCardTextLeftCss = css({
  textAlign: 'left',
  '& .euiCard__top': {
    alignSelf: 'flex-start',
  },
  '& .euiCard__icon': {
    marginInlineStart: 0,
    marginInlineEnd: 0,
  },
});

export interface RuleCreationEntryCardsProps {
  esqlHref: string;
  showAiCard: boolean;
  onCreateWithAi?: () => void;
}

/**
 * Primary entry cards: ES|QL-first creation and optional AI-assisted flow,
 * shown before the rule builder grid on the rules list empty state.
 */
export const RuleCreationEntryCards = ({
  esqlHref,
  showAiCard,
  onCreateWithAi,
}: RuleCreationEntryCardsProps) => {
  const esqlIcon = <EuiIcon type="editorCodeBlock" size="l" color="text" aria-hidden={true} />;
  const aiIcon = <EuiIcon type="productAgent" size="l" color="text" aria-hidden={true} />;

  const esqlDescription = (
    <EuiText size="s">
      <p>
        <FormattedMessage
          id="xpack.alertingV2.rulesList.emptyStateCreateWithEsqlCardDescription"
          defaultMessage="Open the create rule form in ES|QL mode to write and edit your evaluation query directly."
        />
      </p>
    </EuiText>
  );

  const aiDescription = (
    <EuiText size="s">
      <p>
        <FormattedMessage
          id="xpack.alertingV2.rulesList.emptyStateCreateWithAiCardDescription"
          defaultMessage="Use AI to help you draft or refine your rule configuration in context."
        />
      </p>
    </EuiText>
  );

  return (
    <EuiFlexGrid columns={showAiCard ? 2 : 1} gutterSize="m">
      <EuiFlexItem>
        <EuiCard
          data-test-subj="rulesListEmptyStateCreateWithEsqlCard"
          icon={esqlIcon}
          layout="vertical"
          textAlign="left"
          css={verticalCardTextLeftCss}
          title={
            <FormattedMessage
              id="xpack.alertingV2.rulesList.emptyStateCreateWithEsqlCardTitle"
              defaultMessage="Create with ES|QL"
            />
          }
          titleElement="h3"
          titleSize="xs"
          description={esqlDescription}
          href={esqlHref}
          hasBorder={true}
          display="plain"
        />
      </EuiFlexItem>
      {showAiCard ? (
        <EuiFlexItem>
          <EuiCard
            data-test-subj="rulesListEmptyStateCreateWithAiCard"
            icon={aiIcon}
            layout="vertical"
            textAlign="left"
            css={verticalCardTextLeftCss}
            title={
              <FormattedMessage
                id="xpack.alertingV2.rulesList.emptyStateCreateWithAiCardTitle"
                defaultMessage="Create with AI"
              />
            }
            titleElement="h3"
            titleSize="xs"
            description={aiDescription}
            onClick={onCreateWithAi}
            hasBorder={true}
            display="plain"
          />
        </EuiFlexItem>
      ) : null}
    </EuiFlexGrid>
  );
};
