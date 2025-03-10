/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// /*
//  * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
//  * or more contributor license agreements. Licensed under the Elastic License
//  * 2.0; you may not use this file except in compliance with the Elastic License
//  * 2.0.
//  */

// import type { ElasticsearchClient, SavedObjectsClient } from '@kbn/core/server';

// import { agentPolicyService } from '../services';
// import { getPackageSavedObjects } from '../services/epm/packages/get';

// import { getAgenlessUsage } from './agentless_collectors';

// jest.mock('../services/epm/packages/get', () => ({
//   getPackageSavedObjects: jest.fn(),
// }));

// jest.mock('../services', () => ({
//   agentPolicyService: {
//     list: jest.fn(),
//   },
// }));

// jest.mock('./agent_collectors', () => ({
//   getAgentUsage: jest.fn().mockResolvedValue({
//     total_enrolled: 2,
//     healthy: 1,
//     unhealthy: 1,
//     offline: 0,
//     inactive: 0,
//     unenrolled: 0,
//     total_all_statuses: 2,
//     updating: 0,
//   }),
// }));

// describe('getAgenlessUsage', () => {
//   const esClientMock = {} as unknown as ElasticsearchClient;
//   const soClientMock = {} as unknown as SavedObjectsClient;

//   afterEach(() => {
//     jest.clearAllMocks();
//   });

//   it('should return default values when no soClient is provided', async () => {
//     const result = await getAgenlessUsage(undefined, esClientMock);

//     expect(result).toEqual({
//       agentlessPackages: [],
//       agentlessAgents: {
//         total_enrolled: 0,
//         healthy: 0,
//         unhealthy: 0,
//         offline: 0,
//         inactive: 0,
//         unenrolled: 0,
//         total_all_statuses: 0,
//         updating: 0,
//       },
//     });
//   });

//   it('should return empty agentlessPackages when no agent policies exist', async () => {
//     (getPackageSavedObjects as jest.Mock).mockResolvedValue({ saved_objects: [] });
//     (agentPolicyService.list as jest.Mock).mockResolvedValue({ items: [] });

//     const result = await getAgenlessUsage(soClientMock, esClientMock);

//     expect(result.agentlessPackages).toEqual([]);
//     expect(result.agentlessAgents).toEqual({
//       total_enrolled: 2,
//       healthy: 1,
//       unhealthy: 1,
//       offline: 0,
//       inactive: 0,
//       unenrolled: 0,
//       total_all_statuses: 2,
//       updating: 0,
//     });
//   });

//   it('should return agentlessPackages when policies contain agentless-supporting packages', async () => {
//     (getPackageSavedObjects as jest.Mock).mockResolvedValue({
//       saved_objects: [
//         { attributes: { name: 'package1', version: '1.0.0' } },
//         { attributes: { name: 'package2', version: '2.0.0' } },
//       ],
//     });

//     (agentPolicyService.list as jest.Mock).mockResolvedValue({
//       items: [
//         {
//           id: 'policy1',
//           package_policies: [{ supports_agentless: true, package: { name: 'package1' } }],
//         },
//         {
//           id: 'policy2',
//           package_policies: [{ supports_agentless: true, package: { name: 'package2' } }],
//         },
//       ],
//     });

//     const result = await getAgenlessUsage(soClientMock, esClientMock);

//     expect(result.agentlessPackages).toEqual([
//       { name: 'package1', version: '1.0.0', enabled: true },
//       { name: 'package2', version: '2.0.0', enabled: true },
//     ]);

//     expect(result.agentlessAgents).toEqual({
//       total_enrolled: 2,
//       healthy: 1,
//       unhealthy: 1,
//       offline: 0,
//       inactive: 0,
//       unenrolled: 0,
//       total_all_statuses: 2,
//       updating: 0,
//     });
//   });

//   it('should correctly handle duplicate packages', async () => {
//     (getPackageSavedObjects as jest.Mock).mockResolvedValue({
//       saved_objects: [
//         { attributes: { name: 'package1', version: '1.0.0' } },
//         { attributes: { name: 'package2', version: '2.0.0' } },
//       ],
//     });

//     (agentPolicyService.list as jest.Mock).mockResolvedValue({
//       items: [
//         {
//           id: 'policy1',
//           package_policies: [{ supports_agentless: true, package: { name: 'package1' } }],
//         },
//         {
//           id: 'policy2',
//           package_policies: [
//             { supports_agentless: true, package: { name: 'package1' } }, // Duplicate
//             { supports_agentless: true, package: { name: 'package2' } },
//           ],
//         },
//       ],
//     });

//     const result = await getAgenlessUsage(soClientMock, esClientMock);

//     expect(result.agentlessPackages).toEqual([
//       { name: 'package1', version: '1.0.0', enabled: true },
//       { name: 'package2', version: '2.0.0', enabled: true },
//     ]);
//   });
// });
