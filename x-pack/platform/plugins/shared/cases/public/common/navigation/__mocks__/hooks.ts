/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const useCaseViewParams = jest.fn().mockReturnValue({ detailName: 'basic-case-id' });

export const useAllCasesNavigation = jest.fn().mockReturnValue({
  getAllCasesUrl: jest.fn().mockReturnValue('/app/security/cases'),
  navigateToAllCases: jest.fn(),
});

export const useCreateCaseNavigation = jest.fn().mockReturnValue({
  getCreateCaseUrl: jest.fn().mockReturnValue('/app/security/cases/create'),
  navigateToCreateCase: jest.fn(),
});

export const useCaseViewNavigation = jest.fn().mockReturnValue({
  getCaseViewUrl: jest.fn().mockReturnValue('/app/security/cases/test'),
  navigateToCaseView: jest.fn(),
});

export const useConfigureCasesNavigation = jest.fn().mockReturnValue({
  getConfigureCasesUrl: jest.fn().mockReturnValue('/app/security/cases/configure'),
  navigateToConfigureCases: jest.fn(),
});

export const useCasesTemplatesNavigation = jest.fn().mockReturnValue({
  getCasesTemplatesUrl: jest.fn().mockReturnValue('/app/security/cases/configure/templates'),
  navigateToCasesTemplates: jest.fn(),
});

export const useCasesFieldLibraryNavigation = jest.fn().mockReturnValue({
  getCasesFieldLibraryUrl: jest.fn().mockReturnValue('/app/security/cases/configure/field_library'),
  navigateToCasesFieldLibrary: jest.fn(),
});

export const useUrlParams = jest.fn().mockReturnValue({
  urlParams: {},
  toUrlParams: jest.fn(),
});
