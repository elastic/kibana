/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiPopover, EuiBadge, EuiPopoverTitle, EuiFlexGroup } from '@elastic/eui';

const tagTitle = i18n.translate(
  'xpack.triggersActionsUI.sections.rules_list.rules_tag_badge.tagTitle',
  {
    defaultMessage: 'Tag',
  }
);

export type RuleTagBadgeOptions = 'tagsOutPopover' | 'default';

export interface RuleTagBadgeBasicOptions {
  isOpen: boolean;
  onClick: React.MouseEventHandler<HTMLButtonElement>;
  onClose: () => void;
}

export interface RuleTagBadgeCommonProps {
  tagsOutPopover?: boolean;
  tags: string[];
  badgeDataTestSubj?: string;
  titleDataTestSubj?: string;
  tagItemDataTestSubj?: (tag: string) => string;
}

export type RuleTagBadgeProps<T extends RuleTagBadgeOptions = 'default'> = T extends 'default'
  ? RuleTagBadgeBasicOptions & RuleTagBadgeCommonProps
  : T extends 'tagsOutPopover'
  ? RuleTagBadgeCommonProps
  : never;

const containerStyle = {
  width: '300px',
};

const getTagItemDataTestSubj = (tag: string) => `ruleTagBadgeItem-${tag}`;

export const RuleTagBadge = <T extends RuleTagBadgeOptions>(props: RuleTagBadgeProps<T>) => {
  const {
    tagsOutPopover = false,
    tags = [],
    badgeDataTestSubj = 'ruleTagBadge',
    titleDataTestSubj = 'ruleTagPopoverTitle',
    tagItemDataTestSubj = getTagItemDataTestSubj,
  } = props;
  const { isOpen, onClose, onClick } = props as RuleTagBadgeBasicOptions;

  const badge = useMemo(() => {
    return (
      <EuiBadge
        data-test-subj={badgeDataTestSubj}
        color="hollow"
        iconType="tag"
        iconSide="left"
        tabIndex={-1}
        onClick={onClick}
        onClickAriaLabel="Tags"
      >
        {tags.length}
      </EuiBadge>
    );
  }, [badgeDataTestSubj, onClick, tags.length]);

  const tagBadges = useMemo(
    () =>
      tags.map((tag, index) => (
        <EuiBadge
          data-test-subj={tagItemDataTestSubj(tag)}
          key={index}
          color="hollow"
          iconType="tag"
          iconSide="left"
        >
          {tag}
        </EuiBadge>
      )),
    [tags, tagItemDataTestSubj]
  );
  if (tagsOutPopover) {
    return (
      // Put 0 to fix negative left margin value.
      <EuiFlexGroup
        data-test-subj="tagsOutPopover"
        gutterSize="s"
        style={{ marginLeft: 0 }}
        wrap={true}
      >
        {tagBadges}
      </EuiFlexGroup>
    );
  }

  return (
    <EuiPopover
      button={badge}
      anchorPosition="upCenter"
      isOpen={isOpen} // The props exists as it's required in props types
      closePopover={onClose}
    >
      <EuiPopoverTitle data-test-subj={titleDataTestSubj}>{tagTitle}</EuiPopoverTitle>
      <div style={containerStyle}>{tagBadges}</div>
    </EuiPopover>
  );
};

// eslint-disable-next-line import/no-default-export
export { RuleTagBadge as default };
