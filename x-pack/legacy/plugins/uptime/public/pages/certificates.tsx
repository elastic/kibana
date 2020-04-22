/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { useDispatch } from 'react-redux';
import { Link } from 'react-router-dom';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiPanel, EuiSpacer } from '@elastic/eui';
import React, { useEffect, useState } from 'react';
import { useUptimeTelemetry, UptimePage } from '../hooks';
import { useTrackPageview } from '../../../../../plugins/observability/public';
import { PageHeader } from './page_header';
import { useBreadcrumbs } from '../hooks/use_breadcrumbs';
import { CertificateList, CertSort } from '../components/certificates/certificates_list';
import { CertificateSearch } from '../components/certificates/certificate_search';
import { OVERVIEW_ROUTE, SETTINGS_ROUTE } from '../../common/constants';
import { getDynamicSettings } from '../state/actions/dynamic_settings';
import { getCertificatesAction } from '../state/certificates/certificates';

export const CertificatesPage: React.FC = () => {
  useUptimeTelemetry(UptimePage.Certificates);

  useTrackPageview({ app: 'uptime', path: 'certificates' });
  useTrackPageview({ app: 'uptime', path: 'certificates', delay: 15000 });

  useBreadcrumbs([{ text: 'Certificates' }]);

  const [page, setPage] = useState({ index: 0, size: 10 });
  const [sort, setSort] = useState<CertSort>({
    field: 'certificate_not_valid_after',
    direction: 'asc',
  });
  const [search, setSearch] = useState('');

  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(getDynamicSettings());
  }, [dispatch]);

  useEffect(() => {
    dispatch(
      getCertificatesAction.get({ search, ...page, sortBy: sort.field, direction: sort.direction })
    );
  }, [dispatch, page, search, sort.direction, sort.field]);

  return (
    <>
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <Link to={OVERVIEW_ROUTE} data-test-subj="uptimeCertificatesToOverviewLink">
            <EuiButtonEmpty size="s" color="primary" iconType="arrowLeft">
              {i18n.translate('xpack.uptime.certificates.returnToOverviewLinkLabel', {
                defaultMessage: 'Return to overview',
              })}
            </EuiButtonEmpty>
          </Link>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <Link to={SETTINGS_ROUTE} data-test-subj="uptimeCertificatesToOverviewLink">
            <EuiButtonEmpty size="s" color="primary" iconType="gear">
              {i18n.translate('xpack.uptime.certificates.settingsLinkLabel', {
                defaultMessage: 'Settings',
              })}
            </EuiButtonEmpty>
          </Link>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="m" />
      <EuiPanel>
        <PageHeader headingText={'TLS Certificates'} datePicker={false} />
        <EuiSpacer size="m" />
        <CertificateSearch setSearch={setSearch} />
        <EuiSpacer size="m" />
        <CertificateList
          page={page}
          onChange={(pageVal, sortVal) => {
            setPage(pageVal);
            setSort(sortVal);
          }}
          sort={sort}
        />
      </EuiPanel>
    </>
  );
};
