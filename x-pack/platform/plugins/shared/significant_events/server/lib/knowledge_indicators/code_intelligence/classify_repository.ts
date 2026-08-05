/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IAC_LANGUAGES, NON_APP_LANGUAGES } from './constants';
import type { IacSignal, LanguageCount, RepoClassification, RepoType } from './types';

const normalizeLanguage = (language: string): string => language.trim().toLowerCase();

/**
 * Precomputed, deterministic repository classification from a language histogram
 * and Infrastructure-as-Code file signals. A repository is `iac` when it
 * contains IaC languages (Terraform/HCL) or IaC file signals (Kubernetes, Helm,
 * Compose, …), `app` when it contains programming languages, and `both` when it
 * contains both. IaC file signals are needed because the language histogram
 * cannot tell IaC YAML (k8s/Helm/Compose) apart from an application's own
 * config YAML.
 *
 * The primary application language is the highest-volume non-IaC, non-markup
 * language, used to emit a `language` Feature KI.
 */
export function classifyRepository(
  languageHistogram: LanguageCount[],
  iacSignals: IacSignal[] = []
): RepoClassification {
  const languages: LanguageCount[] = languageHistogram
    .map(({ language, count }) => ({ language: normalizeLanguage(language), count }))
    .filter(({ language }) => language.length > 0);

  const hasIacLanguage = languages.some(({ language }) => IAC_LANGUAGES.has(language));
  const isIac = hasIacLanguage || iacSignals.length > 0;
  const appLanguages = languages
    .filter(({ language }) => !NON_APP_LANGUAGES.has(language))
    .sort((a, b) => b.count - a.count);
  const isApp = appLanguages.length > 0;

  const repoType: RepoType = isApp && isIac ? 'both' : isIac ? 'iac' : 'app';

  return {
    repoType,
    isApp,
    isIac,
    primaryLanguage: appLanguages[0]?.language,
    languages,
    iacSignals,
  };
}
