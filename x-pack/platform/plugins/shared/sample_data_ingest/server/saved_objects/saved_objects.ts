/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject } from '@kbn/core/server';
import { DatasetSampleType } from '../../common';

export const getDashboardId = (sampleType: DatasetSampleType): string | undefined => {
  const savedObjects = getSavedObjects(sampleType);
  const dashboard = savedObjects.find((obj) => obj.type === 'dashboard');
  return dashboard?.id;
};

export const getSavedObjects = (sampleType: DatasetSampleType): SavedObject[] =>
  ({
    [DatasetSampleType.elasticsearch]: [
      {
        id: '0e5a8704-b6fa-4320-9b73-65f692379500',
        type: 'index-pattern',
        version: '1',
        attributes: {
          fields: '[]',
          title: 'kibana_sample_data_elasticsearch_documentation',
          sourceFilters: '[]',
          fieldFormatMap: '{}',
          fieldAttrs: '{}',
          runtimeFieldMap: '{}',
          name: 'Kibana Sample Data Elasticsearch Documentation',
          allowHidden: false,
        },
        references: [],
      },
      {
        id: 'c87c6b86-b289-455a-97de-dba5f25174aa',
        type: 'dashboard',
        namespaces: ['default'],
        version: 'WzQxLDFd',
        attributes: {
          version: 1,
          description: 'Analyze Elasticsearch documentation sample set',
          timeRestore: false,
          title: '[Sample Data Docs] Elasticsearch documentation',
          controlGroupInput: {
            chainingSystem: 'HIERARCHICAL',
            controlStyle: 'oneLine',
            showApplySelections: false,
            ignoreParentSettingsJSON:
              '{"ignoreFilters":false,"ignoreQuery":false,"ignoreTimerange":false,"ignoreValidations":false}',
            panelsJSON: '{}',
          },
          optionsJSON:
            '{"useMargins":true,"syncColors":false,"syncCursor":true,"syncTooltips":false,"hidePanelTitles":false}',
          panelsJSON:
            '[{"type":"lens","embeddableConfig":{"enhancements":{"dynamicActions":{"events":[]}},"syncColors":false,"syncCursor":true,"syncTooltips":false,"filters":[],"query":{"query":"","language":"kuery"},"attributes":{"title":"","visualizationType":"lnsMetric","type":"lens","references":[{"type":"index-pattern","id":"0e5a8704-b6fa-4320-9b73-65f692379500","name":"indexpattern-datasource-layer-bb55c50b-a3d7-4c75-aecb-956ca4566cd2"}],"state":{"visualization":{"layerId":"bb55c50b-a3d7-4c75-aecb-956ca4566cd2","layerType":"data","metricAccessor":"9e9a3b36-4a7f-41b5-af37-3735abbfab9d","secondaryTrend":{"type":"none"}},"query":{"query":"","language":"kuery"},"filters":[],"datasourceStates":{"formBased":{"layers":{"bb55c50b-a3d7-4c75-aecb-956ca4566cd2":{"columns":{"9e9a3b36-4a7f-41b5-af37-3735abbfab9d":{"label":"Unique count of ai_tags","dataType":"number","operationType":"unique_count","sourceField":"ai_tags","isBucketed":false,"params":{"emptyAsNull":true}}},"columnOrder":["9e9a3b36-4a7f-41b5-af37-3735abbfab9d"],"sampling":1,"ignoreGlobalFilters":false,"incompleteColumns":{}}}},"indexpattern":{"layers":{}},"textBased":{"layers":{}}},"internalReferences":[],"adHocDataViews":{}}}},"panelIndex":"b09ba45d-618c-4cba-b27a-b7a466a48b60","gridData":{"i":"b09ba45d-618c-4cba-b27a-b7a466a48b60","y":6,"x":0,"w":10,"h":7}},{"type":"lens","embeddableConfig":{"enhancements":{"dynamicActions":{"events":[]}},"syncColors":false,"syncCursor":true,"syncTooltips":false,"filters":[],"query":{"query":"","language":"kuery"},"attributes":{"title":"","visualizationType":"lnsPie","type":"lens","references":[{"type":"index-pattern","id":"0e5a8704-b6fa-4320-9b73-65f692379500","name":"indexpattern-datasource-layer-02095a64-ec91-4047-9f30-a8ea76c24f99"}],"state":{"visualization":{"shape":"treemap","layers":[{"layerId":"02095a64-ec91-4047-9f30-a8ea76c24f99","primaryGroups":["cd3372b7-6065-48cb-b5fb-ef6a522c4798"],"metrics":["b21d40b7-792e-464a-b761-456f83d0e9ec"],"numberDisplay":"percent","categoryDisplay":"default","legendDisplay":"default","nestedLegend":false,"layerType":"data","colorMapping":{"assignments":[],"specialAssignments":[{"rules":[{"type":"other"}],"color":{"type":"loop"},"touched":false}],"paletteId":"default","colorMode":{"type":"categorical"}}}]},"query":{"query":"","language":"kuery"},"filters":[],"datasourceStates":{"formBased":{"layers":{"02095a64-ec91-4047-9f30-a8ea76c24f99":{"columns":{"cd3372b7-6065-48cb-b5fb-ef6a522c4798":{"label":"Top 10 values of ai_tags","dataType":"string","operationType":"terms","sourceField":"ai_tags","isBucketed":true,"params":{"size":10,"orderBy":{"type":"column","columnId":"b21d40b7-792e-464a-b761-456f83d0e9ec"},"orderDirection":"desc","otherBucket":true,"missingBucket":false,"parentFormat":{"id":"terms"},"include":[],"exclude":[],"includeIsRegex":false,"excludeIsRegex":false,"accuracyMode":true}},"b21d40b7-792e-464a-b761-456f83d0e9ec":{"label":"Unique count of ai_tags","dataType":"number","operationType":"unique_count","sourceField":"ai_tags","isBucketed":false,"params":{"emptyAsNull":true}}},"columnOrder":["cd3372b7-6065-48cb-b5fb-ef6a522c4798","b21d40b7-792e-464a-b761-456f83d0e9ec"],"sampling":1,"ignoreGlobalFilters":false,"incompleteColumns":{}}}},"indexpattern":{"layers":{}},"textBased":{"layers":{}}},"internalReferences":[],"adHocDataViews":{}}}},"panelIndex":"fe0aba18-8168-46b0-bf6c-296ed592ca15","gridData":{"i":"fe0aba18-8168-46b0-bf6c-296ed592ca15","y":13,"x":0,"w":48,"h":20}},{"type":"DASHBOARD_MARKDOWN","embeddableConfig":{"content":"## Elasticsearch documentation sample set\\n\\nThis is a sample set of the Elasticsearch documentation to help you explore and test our queries and natural language chat experiences."},"panelIndex":"34502845-e3ac-4ddd-b171-9cb03d40e813","gridData":{"i":"34502845-e3ac-4ddd-b171-9cb03d40e813","y":0,"x":0,"w":21,"h":6}},{"type":"lens","embeddableConfig":{"enhancements":{"dynamicActions":{"events":[]}},"syncColors":false,"syncCursor":true,"syncTooltips":false,"filters":[],"query":{"query":"","language":"kuery"},"attributes":{"title":"","visualizationType":"lnsMetric","type":"lens","references":[{"type":"index-pattern","id":"0e5a8704-b6fa-4320-9b73-65f692379500","name":"indexpattern-datasource-layer-5d686459-c8d2-4215-8b49-07322e3799f4"}],"state":{"visualization":{"layerId":"5d686459-c8d2-4215-8b49-07322e3799f4","layerType":"data","metricAccessor":"6a5f6332-04d7-4c95-80cb-f24820f372db","secondaryTrend":{"type":"none"}},"query":{"query":"","language":"kuery"},"filters":[],"datasourceStates":{"formBased":{"layers":{"5d686459-c8d2-4215-8b49-07322e3799f4":{"columns":{"6a5f6332-04d7-4c95-80cb-f24820f372db":{"label":"Count of records","dataType":"number","operationType":"count","isBucketed":false,"sourceField":"___records___","params":{"emptyAsNull":true}}},"columnOrder":["6a5f6332-04d7-4c95-80cb-f24820f372db"],"sampling":1,"ignoreGlobalFilters":false,"incompleteColumns":{}}}},"indexpattern":{"layers":{}},"textBased":{"layers":{}}},"internalReferences":[],"adHocDataViews":{}}}},"panelIndex":"1c5f7c35-74ef-410e-abb0-612479595997","gridData":{"i":"1c5f7c35-74ef-410e-abb0-612479595997","y":6,"x":10,"w":11,"h":7}},{"type":"lens","embeddableConfig":{"enhancements":{"dynamicActions":{"events":[]}},"syncColors":false,"syncCursor":true,"syncTooltips":false,"filters":[],"query":{"query":"","language":"kuery"},"attributes":{"title":"","visualizationType":"lnsTagcloud","type":"lens","references":[{"type":"index-pattern","id":"0e5a8704-b6fa-4320-9b73-65f692379500","name":"indexpattern-datasource-layer-093ff5e2-70cc-44be-95cf-b3ac9301d865"}],"state":{"visualization":{"layerId":"093ff5e2-70cc-44be-95cf-b3ac9301d865","layerType":"data","maxFontSize":72,"minFontSize":18,"orientation":"single","showLabel":true,"colorMapping":{"assignments":[],"specialAssignments":[{"rules":[{"type":"other"}],"color":{"type":"loop"},"touched":false}],"paletteId":"default","colorMode":{"type":"categorical"}},"tagAccessor":"9f01ecd6-a412-4cf3-b01a-51db1d44afab","valueAccessor":"57ed22fc-770c-4674-8a8e-2591794dbc46"},"query":{"query":"","language":"kuery"},"filters":[],"datasourceStates":{"formBased":{"layers":{"093ff5e2-70cc-44be-95cf-b3ac9301d865":{"columns":{"9f01ecd6-a412-4cf3-b01a-51db1d44afab":{"label":"Top 20 values of ai_tags","dataType":"string","operationType":"terms","sourceField":"ai_tags","isBucketed":true,"params":{"size":20,"orderBy":{"type":"column","columnId":"57ed22fc-770c-4674-8a8e-2591794dbc46"},"orderDirection":"desc","otherBucket":true,"missingBucket":false,"parentFormat":{"id":"terms"},"include":[],"exclude":[],"includeIsRegex":false,"excludeIsRegex":false,"accuracyMode":true}},"57ed22fc-770c-4674-8a8e-2591794dbc46":{"label":"Unique count of ai_tags","dataType":"number","operationType":"unique_count","sourceField":"ai_tags","isBucketed":false,"params":{"emptyAsNull":true}}},"columnOrder":["9f01ecd6-a412-4cf3-b01a-51db1d44afab","57ed22fc-770c-4674-8a8e-2591794dbc46"],"sampling":1,"ignoreGlobalFilters":false,"incompleteColumns":{}}}},"indexpattern":{"layers":{}},"textBased":{"layers":{}}},"internalReferences":[],"adHocDataViews":{}}}},"panelIndex":"5f9e28aa-90e2-41ba-947c-0c26eb721477","gridData":{"i":"5f9e28aa-90e2-41ba-947c-0c26eb721477","y":0,"x":21,"w":27,"h":13}}]',
          kibanaSavedObjectMeta: {
            searchSourceJSON: '{"filter":[],"query":{"query":"","language":"kuery"}}',
          },
        },
        references: [
          {
            type: 'index-pattern',
            id: '0e5a8704-b6fa-4320-9b73-65f692379500',
            name: 'b09ba45d-618c-4cba-b27a-b7a466a48b60:indexpattern-datasource-layer-bb55c50b-a3d7-4c75-aecb-956ca4566cd2',
          },
          {
            type: 'index-pattern',
            id: '0e5a8704-b6fa-4320-9b73-65f692379500',
            name: 'fe0aba18-8168-46b0-bf6c-296ed592ca15:indexpattern-datasource-layer-02095a64-ec91-4047-9f30-a8ea76c24f99',
          },
          {
            type: 'index-pattern',
            id: '0e5a8704-b6fa-4320-9b73-65f692379500',
            name: '1c5f7c35-74ef-410e-abb0-612479595997:indexpattern-datasource-layer-5d686459-c8d2-4215-8b49-07322e3799f4',
          },
          {
            type: 'index-pattern',
            id: '0e5a8704-b6fa-4320-9b73-65f692379500',
            name: '5f9e28aa-90e2-41ba-947c-0c26eb721477:indexpattern-datasource-layer-093ff5e2-70cc-44be-95cf-b3ac9301d865',
          },
        ],
        managed: false,
        coreMigrationVersion: '8.8.0',
        typeMigrationVersion: '10.3.0',
      },
    ],
  }[sampleType]);
