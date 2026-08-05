/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface AwsRegionOption {
  id: string;
  label: string;
  countryCode: string;
}

/**
 * Commercial and GovCloud AWS regions with display labels from AWS documentation.
 * @see https://docs.aws.amazon.com/general/latest/gr/rande.html
 */
const AWS_REGION_DEFINITIONS: AwsRegionOption[] = [
  { id: 'af-south-1', label: 'Africa (Cape Town)', countryCode: 'ZA' },
  { id: 'ap-east-1', label: 'Asia Pacific (Hong Kong)', countryCode: 'HK' },
  { id: 'ap-east-2', label: 'Asia Pacific (Taipei)', countryCode: 'TW' },
  { id: 'ap-northeast-1', label: 'Asia Pacific (Tokyo)', countryCode: 'JP' },
  { id: 'ap-northeast-2', label: 'Asia Pacific (Seoul)', countryCode: 'KR' },
  { id: 'ap-northeast-3', label: 'Asia Pacific (Osaka)', countryCode: 'JP' },
  { id: 'ap-south-1', label: 'Asia Pacific (Mumbai)', countryCode: 'IN' },
  { id: 'ap-south-2', label: 'Asia Pacific (Hyderabad)', countryCode: 'IN' },
  { id: 'ap-southeast-1', label: 'Asia Pacific (Singapore)', countryCode: 'SG' },
  { id: 'ap-southeast-2', label: 'Asia Pacific (Sydney)', countryCode: 'AU' },
  { id: 'ap-southeast-3', label: 'Asia Pacific (Jakarta)', countryCode: 'ID' },
  { id: 'ap-southeast-4', label: 'Asia Pacific (Melbourne)', countryCode: 'AU' },
  { id: 'ap-southeast-5', label: 'Asia Pacific (Malaysia)', countryCode: 'MY' },
  { id: 'ap-southeast-6', label: 'Asia Pacific (New Zealand)', countryCode: 'NZ' },
  { id: 'ap-southeast-7', label: 'Asia Pacific (Thailand)', countryCode: 'TH' },
  { id: 'ca-central-1', label: 'Canada (Central)', countryCode: 'CA' },
  { id: 'ca-west-1', label: 'Canada West (Calgary)', countryCode: 'CA' },
  { id: 'eu-central-1', label: 'Europe (Frankfurt)', countryCode: 'DE' },
  { id: 'eu-central-2', label: 'Europe (Zurich)', countryCode: 'CH' },
  { id: 'eu-north-1', label: 'Europe (Stockholm)', countryCode: 'SE' },
  { id: 'eu-south-1', label: 'Europe (Milan)', countryCode: 'IT' },
  { id: 'eu-south-2', label: 'Europe (Spain)', countryCode: 'ES' },
  { id: 'eu-west-1', label: 'Europe (Ireland)', countryCode: 'IE' },
  { id: 'eu-west-2', label: 'Europe (London)', countryCode: 'GB' },
  { id: 'eu-west-3', label: 'Europe (Paris)', countryCode: 'FR' },
  { id: 'il-central-1', label: 'Israel (Tel Aviv)', countryCode: 'IL' },
  { id: 'me-central-1', label: 'Middle East (UAE)', countryCode: 'AE' },
  { id: 'me-south-1', label: 'Middle East (Bahrain)', countryCode: 'BH' },
  { id: 'mx-central-1', label: 'Mexico (Central)', countryCode: 'MX' },
  { id: 'sa-east-1', label: 'South America (São Paulo)', countryCode: 'BR' },
  { id: 'us-east-1', label: 'US East (N. Virginia)', countryCode: 'US' },
  { id: 'us-east-2', label: 'US East (Ohio)', countryCode: 'US' },
  { id: 'us-gov-east-1', label: 'AWS GovCloud (US-East)', countryCode: 'US' },
  { id: 'us-gov-west-1', label: 'AWS GovCloud (US-West)', countryCode: 'US' },
  { id: 'us-west-1', label: 'US West (N. California)', countryCode: 'US' },
  { id: 'us-west-2', label: 'US West (Oregon)', countryCode: 'US' },
];

export const AWS_REGIONS: AwsRegionOption[] = [...AWS_REGION_DEFINITIONS].sort((left, right) =>
  left.label.localeCompare(right.label)
);

export const AWS_REGION_LABELS: Record<string, string> = Object.fromEntries(
  AWS_REGIONS.map((region) => [region.id, region.label])
);

export const getAwsRegionLabel = (regionId: string): string =>
  AWS_REGION_LABELS[regionId] ?? regionId;

/** Returns a regional indicator emoji flag for a two-letter country code, e.g. `US` -> 🇺🇸 */
export const getCountryFlagEmoji = (countryCode: string): string | null =>
  countryCode.length === 2
    ? countryCode
        .toUpperCase()
        .replace(/./g, (character) => String.fromCharCode(55356, 56741 + character.charCodeAt(0)))
    : null;
