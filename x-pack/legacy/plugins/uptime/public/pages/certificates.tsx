/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiSpacer } from '@elastic/eui';
import React from 'react';
import { useUptimeTelemetry, UptimePage } from '../hooks';
import { useTrackPageview } from '../../../../../plugins/observability/public';
import { PageHeader } from './page_header';
import { useBreadcrumbs } from '../hooks/use_breadcrumbs';
import { CertificateList } from '../components/certificates/certificates_list';
import { CertificateSearch } from '../components/certificates/certificate_search';

export const CertificatesPage: React.FC = () => {
  useUptimeTelemetry(UptimePage.Certificates);

  useTrackPageview({ app: 'uptime', path: 'certificates' });
  useTrackPageview({ app: 'uptime', path: 'certificates', delay: 15000 });

  useBreadcrumbs([{ text: 'Certificates' }]);
  return (
    <>
      <PageHeader headingText={'Certificates'} datePicker={false} />
      <EuiSpacer size="m" />
      <CertificateSearch
        placeholder="Search certificates"
        value={''}
        onChange={() => {}}
        isClearable={true}
        aria-label="Use aria labels when no actual label is in use"
      />
      <EuiSpacer size="m" />
      <CertificateList />
    </>
  );
};
