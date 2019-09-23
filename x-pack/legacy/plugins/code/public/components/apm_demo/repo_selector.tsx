/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { EuiButton, EuiSelect } from '@elastic/eui';
import { ImportModal } from './import_modal';
import { isImportRepositoryURLInvalid } from '../../utils/url';

interface Props {
  onSelect: (codeId: string) => void;
  repos: string[];
}

const placeHolderOption = { value: 'select_new', text: 'Select' };
const importNewOption = { value: 'import_new', text: 'Import new' };

export const RepoSelector = ({ onSelect, repos: _repos }: Props) => {
  const [selectedValue, setSelectedValue] = useState(placeHolderOption.value);
  const [newRepo, setNewRepo] = useState('');
  const [isInvalid, setIsInvalid] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const repos = newRepo ? [..._repos, newRepo] : _repos;
  const selectedRepo = repos.find(repo => repo === selectedValue);

  const options = [
    placeHolderOption,
    ...repos.map(repo => ({ value: repo, text: repo })),
    importNewOption,
  ];

  const handleNewRepoChange = ({ target: { value } }: React.ChangeEvent<HTMLInputElement>) => {
    setIsInvalid(isImportRepositoryURLInvalid(value));
    setNewRepo(value);
  };

  const handleChange = ({ target: { value } }: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedValue(value);

    if (value === 'import_new') {
      setShowModal(true);
    }
  };

  const handleSave = () => selectedRepo && onSelect(selectedRepo);

  const handleImportSubmit = () => {
    setSelectedValue(newRepo);
    setShowModal(false);
  };

  const handleClose = () => {
    setSelectedValue(placeHolderOption.value);
    setShowModal(false);
  };

  return (
    <>
      <EuiSelect options={options} value={selectedValue} onChange={handleChange} />
      <EuiButton disabled={!selectedRepo} onClick={handleSave}>
        Save Mapping
      </EuiButton>
      {showModal && (
        <ImportModal
          onChange={handleNewRepoChange}
          value={newRepo}
          isInvalid={isInvalid}
          isLoading={false}
          onClose={handleClose}
          onSubmit={handleImportSubmit}
        />
      )}
    </>
  );
};
