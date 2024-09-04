/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { usePerformanceContext } from '@kbn/ebt-tools';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner, EuiPanel, useEuiTheme } from '@elastic/eui';
import React, { ReactNode } from 'react';
// import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';
// import { isActivePlatinumLicense } from '../../../../common/license_check';
// import { invalidLicenseMessage, SERVICE_MAP_TIMEOUT_ERROR } from '../../../../common/service_map';
// import { FETCH_STATUS, useFetcher } from '../../../hooks/use_fetcher';
// import { useLicenseContext } from '../../../context/license/use_license_context';
// import { useTheme } from '../../../hooks/use_theme';
// import { LicensePrompt } from '../../shared/license_prompt';
import { Controls } from './controls';
import { Cytoscape } from './cytoscape';
import { getCytoscapeDivStyle } from './cytoscape_options';
import { EmptyBanner } from './empty_banner';
import { EmptyPrompt } from './empty_prompt';
// import { Popover } from './popover';
import { TimeoutPrompt } from './timeout_prompt';
import { useRefDimensions } from './use_ref_dimensions';
// import { SearchBar } from '../../shared/search_bar/search_bar';
// import { useServiceName } from '../../../hooks/use_service_name';
// import { useApmParams, useAnyOfApmParams } from '../../../hooks/use_apm_params';
// import { Environment } from '../../../../common/environment_rt';
// import { useTimeRange } from '../../../hooks/use_time_range';
import { DisabledPrompt } from './disabled_prompt';
import { GRAPH_PREVIEW_TEST_ID, GRAPH_PREVIEW_LOADING_TEST_ID } from '../test_ids';

function PromptContainer({ children }: { children: ReactNode }) {
  return (
    <>
      {/* <SearchBar showTimeComparison /> */}
      <EuiFlexGroup
        alignItems="center"
        justifyContent="spaceAround"
        // Set the height to give it some top margin
        style={{ height: '60vh' }}
      >
        <EuiFlexItem grow={false} style={{ width: 600, textAlign: 'center' as const }}>
          {children}
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
}

function LoadingSpinner() {
  return <EuiLoadingSpinner size="xl" style={{ position: 'absolute', top: '50%', left: '50%' }} />;
}

export function GraphViewHome() {
  // const {
  //   query: { environment, kuery, rangeFrom, rangeTo, serviceGroup },
  // } = useApmParams('/service-map');
  // const { start, end } = useTimeRange({ rangeFrom, rangeTo });
  return (
    <GraphView
      // environment={environment}
      kuery={"kuery"}
      start={"start"}
      end={"end"}
      serviceGroupId={"serviceGroup"}
    />
  );
}

// export function ServiceMapServiceDetail() {
//   const {
//     query: { environment, kuery, rangeFrom, rangeTo },
//   } = useAnyOfApmParams(
//     '/services/{serviceName}/service-map',
//     '/mobile-services/{serviceName}/service-map'
//   );
//   const { start, end } = useTimeRange({ rangeFrom, rangeTo });
//   return <GraphView environment={environment} kuery={kuery} start={start} end={end} />;
// }

export function GraphView({
  // environment,
  kuery,
  start,
  end,
  serviceGroupId,
}: {
  // environment: Environment;
  kuery: string;
  start: string;
  end: string;
  serviceGroupId?: string;
}) {
  const { euiTheme } = useEuiTheme();

  // const license = useLicenseContext();
  // const serviceName = useServiceName();
  // const { config } = useApmPluginContext();
  // const { onPageReady } = usePerformanceContext();

  // const {
  //   data = { elements: [] },
  //   status,
  //   error,
  // } = useFetcher(
  //   (callApmApi) => {
  //     // When we don't have a license or a valid license, don't make the request.
  //     if (!license || !isActivePlatinumLicense(license) || !config.serviceMapEnabled) {
  //       return;
  //     }

  //     return callApmApi('GET /internal/apm/service-map', {
  //       isCachable: false,
  //       params: {
  //         query: {
  //           start,
  //           end,
  //           environment,
  //           serviceName,
  //           serviceGroup: serviceGroupId,
  //           kuery,
  //         },
  //       },
  //     });
  //   },
  //   [license, serviceName, environment, start, end, serviceGroupId, kuery, config.serviceMapEnabled]
  // );

  const { ref, height } = useRefDimensions();

  // Temporary hack to work around bottom padding introduced by EuiPage
  const PADDING_BOTTOM = 24;
  const heightWithPadding = height - PADDING_BOTTOM;

  // if (!license) {
  //   return null;
  // }

  // if (!isActivePlatinumLicense(license)) {
  //   return (
  //     <PromptContainer>
  //       <LicensePrompt text={invalidLicenseMessage} />
  //     </PromptContainer>
  //   );
  // }

  // if (!config.serviceMapEnabled) {
  //   return (
  //     <PromptContainer>
  //       <DisabledPrompt />
  //     </PromptContainer>
  //   );
  // }

  const status : 'empty' | 'loading' | 'success' | 'failure' = 'success';

  if (status === 'empty') {
    return (
      <PromptContainer>
        <EmptyPrompt />
      </PromptContainer>
    );
  }

  if (status === 'failure') {
    return (
      <PromptContainer>
        <TimeoutPrompt isGlobalServiceMap={true} />
      </PromptContainer>
    );
  }

  if (status === 'success') {
    // onPageReady();
  }

  return (
    <>
      {/* <SearchBar showTimeComparison /> */}
      <EuiPanel hasBorder={true} paddingSize="none">
        <div data-test-subj={GRAPH_PREVIEW_TEST_ID} style={{ height: heightWithPadding }} ref={ref}>
          <Cytoscape
            // elements={data.elements}
            elements={[]}
            height={heightWithPadding}
            serviceName={"serviceName"}
            // serviceName={serviceName}
            style={getCytoscapeDivStyle(euiTheme/* TODO: KFIR , status */)}
          >
            <Controls />
            {"serviceName" && <EmptyBanner />}
            {status === 'loading' && <LoadingSpinner />}
            {/* <Popover
              focusedServiceName={serviceName}
              environment={environment}
              kuery={kuery}
              start={start}
              end={end}
            /> */}
          </Cytoscape>
        </div>
      </EuiPanel>
    </>
  );
}
