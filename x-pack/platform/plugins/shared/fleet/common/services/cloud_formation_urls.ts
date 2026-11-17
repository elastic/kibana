/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const AWS_QUICK_CREATE_URL =
  'https://console.aws.amazon.com/cloudformation/home#/stacks/quickcreate';

export const TEMPLATE_URL_PARAM_REGEX = /([?&])templateURL=[^&]*/;

type StackParams = Readonly<Record<string, string>>;

export const getQuickCreateUrl = (artifactUrl: string, staticUrl?: string): string => {
  const templateUrlParam = `templateURL=${encodeURIComponent(artifactUrl)}`;
  if (staticUrl && TEMPLATE_URL_PARAM_REGEX.test(staticUrl)) {
    return staticUrl.replace(
      TEMPLATE_URL_PARAM_REGEX,
      (_match, separator: string) => `${separator}${templateUrlParam}`
    );
  }
  return `${AWS_QUICK_CREATE_URL}?${templateUrlParam}`;
};

export const setQuickCreateStackParams = (url: string, stackParams: StackParams): string =>
  Object.entries(stackParams).reduce((acc, [name, value]) => {
    const param = `param_${name}=${encodeURIComponent(value)}`;
    const existingParam = new RegExp(`([?&])param_${name}=[^&]*`);
    if (existingParam.test(acc)) {
      // A replacer function keeps `$` sequences in the value literal.
      return acc.replace(existingParam, (_match, separator: string) => `${separator}${param}`);
    }
    return `${acc}${acc.includes('?') ? '&' : '?'}${param}`;
  }, url);

const CONSOLE_REGION_PARAM_REGEX = /([?&])region=[^&#]*/;

/** Sets the console `region` (before the `#` fragment), replacing one already on the URL. */
export const withConsoleRegion = (url: string, region: string): string => {
  const param = `region=${encodeURIComponent(region)}`;
  if (CONSOLE_REGION_PARAM_REGEX.test(url)) {
    // A replacer function keeps `$` sequences in the value literal.
    return url.replace(
      CONSOLE_REGION_PARAM_REGEX,
      (_match, separator: string) => `${separator}${param}`
    );
  }
  const hashIndex = url.indexOf('#');
  const base = hashIndex === -1 ? url : url.slice(0, hashIndex);
  const fragment = hashIndex === -1 ? '' : url.slice(hashIndex);
  return `${base}${base.includes('?') ? '&' : '?'}${param}${fragment}`;
};

const STACK_NAME_PARAM_REGEX = /([?&])stackName=[^&]*/;

/** Sets the quick-create `stackName`, replacing one already on the URL. */
export const setQuickCreateStackName = (url: string, stackName: string): string => {
  const param = `stackName=${encodeURIComponent(stackName)}`;
  if (STACK_NAME_PARAM_REGEX.test(url)) {
    // A replacer function keeps `$` sequences in the value literal.
    return url.replace(
      STACK_NAME_PARAM_REGEX,
      (_match, separator: string) => `${separator}${param}`
    );
  }
  return `${url}${url.includes('?') ? '&' : '?'}${param}`;
};
