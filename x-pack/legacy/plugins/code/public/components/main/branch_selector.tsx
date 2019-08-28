/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import {
  EuiPopover,
  // @ts-ignore
  EuiFieldSearch,
  EuiListGroup,
  EuiTabbedContent,
  EuiListGroupItem,
  EuiSuperSelect,
} from '@elastic/eui';
import { ReferenceInfo } from '../../../model/commit';

interface Props {
  branches: ReferenceInfo[];
  tags: ReferenceInfo[];
  revision: string;
  getHrefFromRevision: (r: string) => string;
}

enum RevisionSelectorTabs {
  Branches = 'Branches',
  Tags = 'Tags',
}

export const BranchSelector = (props: Props) => {
  const [isPopoverOpen, togglePopoverOpen] = useState(false);
  const [query, setQuery] = useState('');
  const filterRevision = (r: ReferenceInfo) => r.name.toLowerCase().includes(query.toLowerCase());
  const filteredBranches = props.branches.filter(filterRevision);
  const filteredTags = props.tags.filter(filterRevision);
  const getListItem = (b: string) =>
    b === props.revision ? (
      <EuiListGroupItem
        size="s"
        className="codeBranchSelectorRevisionItem"
        label={b}
        isActive={true}
        iconType="check"
        key={b}
        href={props.getHrefFromRevision(b)}
        data-test-subj={`codeBranchSelectOption-${b}Active`}
      ></EuiListGroupItem>
    ) : (
      <EuiListGroupItem
        size="s"
        className="codeBranchSelectorRevisionItem"
        label={b}
        key={b}
        href={props.getHrefFromRevision(b)}
        iconType="empty"
        data-test-subj={`codeBranchSelectOption-${b}`}
      ></EuiListGroupItem>
    );
  const tabs = [
    {
      id: RevisionSelectorTabs.Branches,
      name: RevisionSelectorTabs.Branches,
      content: (
        <div className="codeBranchSelectorTabContentContainer">
          <EuiFieldSearch
            value={query}
            incremental={true}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search branches"
          />
          <EuiListGroup className="codeBranchSelectorTabs">
            {filteredBranches.map(b => getListItem(b.name))}
          </EuiListGroup>
        </div>
      ),
    },
    {
      id: RevisionSelectorTabs.Tags,
      name: RevisionSelectorTabs.Tags,
      content: (
        <div className="codeBranchSelectorTabContentContainer">
          <EuiFieldSearch
            value={query}
            incremental={true}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search tags"
          />
          <EuiListGroup className="codeBranchSelectorTabs">
            {filteredTags.map(b => getListItem(b.name))}
          </EuiListGroup>
        </div>
      ),
    },
  ];
  return (
    // @ts-ignore
    <EuiPopover
      anchorPosition="downLeft"
      panelClassName="codeBranchSelectorPopover"
      display="block"
      isOpen={isPopoverOpen}
      hasArrow={false}
      button={
        <EuiSuperSelect
          onClick={() => togglePopoverOpen(true)}
          data-test-subj="codeBranchSelector"
          valueOfSelected={props.revision}
          options={[{ value: props.revision, inputDisplay: props.revision }]}
        ></EuiSuperSelect>
      }
      closePopover={() => togglePopoverOpen(false)}
    >
      <EuiTabbedContent tabs={tabs} initialSelectedTab={tabs[0]} size={'s'} />
    </EuiPopover>
  );
};
