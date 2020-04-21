/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { useDispatch } from 'react-redux';
import { Link } from 'react-router-dom';
import { EuiButtonEmpty, EuiPanel, EuiSpacer } from '@elastic/eui';
import React, { useEffect, useState } from 'react';
import { useUptimeTelemetry, UptimePage } from '../hooks';
import { useTrackPageview } from '../../../../../plugins/observability/public';
import { PageHeader } from './page_header';
import { useBreadcrumbs } from '../hooks/use_breadcrumbs';
import { CertificateList } from '../components/certificates/certificates_list';
import { CertificateSearch } from '../components/certificates/certificate_search';
import { OVERVIEW_ROUTE } from '../../common/constants';
import { getDynamicSettings } from '../state/actions/dynamic_settings';
import { getCertificatesActions } from '../state/certificates/certificates';

export const CertificatesPage: React.FC = () => {
  useUptimeTelemetry(UptimePage.Certificates);

  useTrackPageview({ app: 'uptime', path: 'certificates' });
  useTrackPageview({ app: 'uptime', path: 'certificates', delay: 15000 });

  useBreadcrumbs([{ text: 'Certificates' }]);

  const [page, setPage] = useState({ index: 0, size: 5 });
  const [search, setSearch] = useState('');

  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(getDynamicSettings());
  }, [dispatch]);

  useEffect(() => {
    dispatch(getCertificatesActions.get({ search, ...page }));
  }, [dispatch, page, search]);

  return (
    <>
      <Link to={OVERVIEW_ROUTE} data-test-subj="uptimeCertificatesToOverviewLink">
        <EuiButtonEmpty size="s" color="primary" iconType="arrowLeft">
          {i18n.translate('xpack.uptime.certificates.returnToOverviewLinkLabel', {
            defaultMessage: 'Return to overview',
          })}
        </EuiButtonEmpty>
      </Link>
      <EuiSpacer size="m" />
      <EuiPanel>
        <PageHeader headingText={'Certificates'} datePicker={false} />
        <EuiSpacer size="m" />
        <CertificateSearch setSearch={setSearch} />
        <EuiSpacer size="m" />
        <CertificateList page={page} setPage={setPage} />
      </EuiPanel>
    </>
  );
};
