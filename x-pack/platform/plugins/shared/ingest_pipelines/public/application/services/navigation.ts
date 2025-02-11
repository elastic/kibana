/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const BASE_PATH = '/';

const EDIT_PATH = 'edit';

const CREATE_PATH = 'create';

const CREATE_FROM_CSV_PATH = 'csv_create';

const MANAGE_PROCESSORS_PATH = 'manage_processors';

const _getEditPath = (name: string, encode = true): string => {
  return `${BASE_PATH}${EDIT_PATH}/${encode ? encodeURIComponent(name) : name}`;
};

const _getCreatePath = (name?: string): string => {
  return `${BASE_PATH}${CREATE_PATH}${name ? `?name=${encodeURIComponent(name)}` : ''}`;
};

const _getClonePath = (name: string, encode = true): string => {
  return `${BASE_PATH}${CREATE_PATH}/${encode ? encodeURIComponent(name) : name}`;
};

const _getListPath = (name?: string): string => {
  return `${BASE_PATH}${name ? `?pipeline=${encodeURIComponent(name)}` : ''}`;
};

const _getCreateFromCsvPath = (): string => {
  return `${BASE_PATH}${CREATE_FROM_CSV_PATH}`;
};

const _getManageProcessorsPath = (): string => {
  return `${BASE_PATH}${MANAGE_PROCESSORS_PATH}`;
};

export const ROUTES = {
  list: _getListPath(),
  edit: _getEditPath(':name', false),
  create: _getCreatePath(),
  clone: _getClonePath(':sourceName', false),
  createFromCsv: _getCreateFromCsvPath(),
  manageProcessors: _getManageProcessorsPath(),
};

export const getListPath = ({
  inspectedPipelineName,
}: {
  inspectedPipelineName?: string;
} = {}): string => _getListPath(inspectedPipelineName);
export const getEditPath = ({ pipelineName }: { pipelineName: string }): string =>
  _getEditPath(pipelineName, true);

export const getCreatePath = ({ pipelineName }: { pipelineName?: string } = {}): string =>
  _getCreatePath(pipelineName);
export const getClonePath = ({ clonedPipelineName }: { clonedPipelineName: string }): string =>
  _getClonePath(clonedPipelineName, true);
export const getCreateFromCsvPath = (): string => _getCreateFromCsvPath();
export const getManageProcessorsPath = (): string => _getManageProcessorsPath();
