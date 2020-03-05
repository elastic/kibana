/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import chrome from 'plugins/monitoring/np_imports/ui/chrome';
import { i18n } from '@kbn/i18n';

// Helper for making objects to use in a link element
const createCrumb = (url, label, testSubj) => {
  const crumb = { url, label };
  if (testSubj) {
    crumb.testSubj = testSubj;
  }
  return crumb;
};

// generate Elasticsearch breadcrumbs
function getElasticsearchBreadcrumbs(mainInstance) {
  const breadcrumbs = [];
  if (mainInstance.instance) {
    breadcrumbs.push(createCrumb('#/elasticsearch', 'Elasticsearch'));
    if (mainInstance.name === 'indices') {
      breadcrumbs.push(
        createCrumb(
          '#/elasticsearch/indices',
          i18n.translate('xpack.monitoring.breadcrumbs.es.indicesLabel', {
            defaultMessage: 'Indices',
          }),
          'breadcrumbEsIndices'
        )
      );
    } else if (mainInstance.name === 'nodes') {
      breadcrumbs.push(
        createCrumb(
          '#/elasticsearch/nodes',
          i18n.translate('xpack.monitoring.breadcrumbs.es.nodesLabel', { defaultMessage: 'Nodes' }),
          'breadcrumbEsNodes'
        )
      );
    } else if (mainInstance.name === 'ml') {
      // ML Instance (for user later)
      breadcrumbs.push(
        createCrumb(
          '#/elasticsearch/ml_jobs',
          i18n.translate('xpack.monitoring.breadcrumbs.es.jobsLabel', { defaultMessage: 'Jobs' })
        )
      );
    } else if (mainInstance.name === 'ccr_shard') {
      breadcrumbs.push(
        createCrumb(
          '#/elasticsearch/ccr',
          i18n.translate('xpack.monitoring.breadcrumbs.es.ccrLabel', { defaultMessage: 'CCR' })
        )
      );
    }
    breadcrumbs.push(createCrumb(null, mainInstance.instance));
  } else {
    // don't link to Overview when we're possibly on Overview or its sibling tabs
    breadcrumbs.push(createCrumb(null, 'Elasticsearch'));
  }
  return breadcrumbs;
}

// generate Kibana breadcrumbs
function getKibanaBreadcrumbs(mainInstance) {
  const breadcrumbs = [];
  if (mainInstance.instance) {
    breadcrumbs.push(createCrumb('#/kibana', 'Kibana'));
    breadcrumbs.push(
      createCrumb(
        '#/kibana/instances',
        i18n.translate('xpack.monitoring.breadcrumbs.kibana.instancesLabel', {
          defaultMessage: 'Instances',
        })
      )
    );
  } else {
    // don't link to Overview when we're possibly on Overview or its sibling tabs
    breadcrumbs.push(createCrumb(null, 'Kibana'));
  }
  return breadcrumbs;
}

// generate Logstash breadcrumbs
function getLogstashBreadcrumbs(mainInstance) {
  const logstashLabel = i18n.translate('xpack.monitoring.breadcrumbs.logstashLabel', {
    defaultMessage: 'Logstash',
  });
  const breadcrumbs = [];
  if (mainInstance.instance) {
    breadcrumbs.push(createCrumb('#/logstash', logstashLabel));
    if (mainInstance.name === 'nodes') {
      breadcrumbs.push(
        createCrumb(
          '#/logstash/nodes',
          i18n.translate('xpack.monitoring.breadcrumbs.logstash.nodesLabel', {
            defaultMessage: 'Nodes',
          })
        )
      );
    }
    breadcrumbs.push(createCrumb(null, mainInstance.instance));
  } else if (mainInstance.page === 'pipeline') {
    breadcrumbs.push(createCrumb('#/logstash', logstashLabel));
    breadcrumbs.push(
      createCrumb(
        '#/logstash/pipelines',
        i18n.translate('xpack.monitoring.breadcrumbs.logstash.pipelinesLabel', {
          defaultMessage: 'Pipelines',
        })
      )
    );
  } else {
    // don't link to Overview when we're possibly on Overview or its sibling tabs
    breadcrumbs.push(createCrumb(null, logstashLabel));
  }

  return breadcrumbs;
}

// generate Beats breadcrumbs
function getBeatsBreadcrumbs(mainInstance) {
  const beatsLabel = i18n.translate('xpack.monitoring.breadcrumbs.beatsLabel', {
    defaultMessage: 'Beats',
  });
  const breadcrumbs = [];
  if (mainInstance.instance) {
    breadcrumbs.push(createCrumb('#/beats', beatsLabel));
    breadcrumbs.push(
      createCrumb(
        '#/beats/beats',
        i18n.translate('xpack.monitoring.breadcrumbs.beats.instancesLabel', {
          defaultMessage: 'Instances',
        })
      )
    );
    breadcrumbs.push(createCrumb(null, mainInstance.instance));
  } else {
    breadcrumbs.push(createCrumb(null, beatsLabel));
  }

  return breadcrumbs;
}

// generate Apm breadcrumbs
function getApmBreadcrumbs(mainInstance) {
  const apmLabel = i18n.translate('xpack.monitoring.breadcrumbs.apmLabel', {
    defaultMessage: 'APM',
  });
  const breadcrumbs = [];
  if (mainInstance.instance) {
    breadcrumbs.push(createCrumb('#/apm', apmLabel));
    breadcrumbs.push(
      createCrumb(
        '#/apm/instances',
        i18n.translate('xpack.monitoring.breadcrumbs.apm.instancesLabel', {
          defaultMessage: 'Instances',
        })
      )
    );
  } else {
    // don't link to Overview when we're possibly on Overview or its sibling tabs
    breadcrumbs.push(createCrumb(null, apmLabel));
  }
  return breadcrumbs;
}

export function breadcrumbsProvider() {
  return function createBreadcrumbs(clusterName, mainInstance) {
    const homeCrumb = i18n.translate('xpack.monitoring.breadcrumbs.clustersLabel', {
      defaultMessage: 'Clusters',
    });

    let breadcrumbs = [createCrumb('#/home', homeCrumb, 'breadcrumbClusters')];

    if (!mainInstance.inOverview && clusterName) {
      breadcrumbs.push(createCrumb('#/overview', clusterName));
    }

    if (mainInstance.inElasticsearch) {
      breadcrumbs = breadcrumbs.concat(getElasticsearchBreadcrumbs(mainInstance));
    }
    if (mainInstance.inKibana) {
      breadcrumbs = breadcrumbs.concat(getKibanaBreadcrumbs(mainInstance));
    }
    if (mainInstance.inLogstash) {
      breadcrumbs = breadcrumbs.concat(getLogstashBreadcrumbs(mainInstance));
    }
    if (mainInstance.inBeats) {
      breadcrumbs = breadcrumbs.concat(getBeatsBreadcrumbs(mainInstance));
    }
    if (mainInstance.inApm) {
      breadcrumbs = breadcrumbs.concat(getApmBreadcrumbs(mainInstance));
    }

    chrome.breadcrumbs.set(
      breadcrumbs.map(b => ({
        text: b.label,
        href: b.url,
        'data-test-subj': b.testSubj,
      }))
    );

    return breadcrumbs;
  };
}
