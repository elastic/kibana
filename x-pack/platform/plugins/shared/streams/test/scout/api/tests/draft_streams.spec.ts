/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import { tags } from '@kbn/scout';
import { streamsApiTest as apiTest } from '../fixtures';
import { PUBLIC_API_HEADERS } from '../fixtures/constants';

apiTest.describe(
  'Draft streams - wired stream draft mode API (CRUD)',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    // Stream names must be exactly one level deep when forking from 'logs'
    const streamNamePrefix = 'logs.draft';

    apiTest.afterEach(async ({ apiServices }) => {
      await apiServices.streamsTest.cleanupTestStreams(streamNamePrefix);
    });

    // Basic draft stream creation via fork
    apiTest('should create a draft child stream via fork API', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asStreamsAdmin();
      const childStreamName = `${streamNamePrefix}-basic`;

      const { statusCode, body } = await apiClient.post('api/streams/logs/_fork', {
        headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
        body: {
          stream: { name: childStreamName },
          where: { field: 'service.name', eq: 'test-service' },
          status: 'enabled',
          draft: true,
        },
        responseType: 'json',
      });

      expect(statusCode).toBe(200);
      expect(body.acknowledged).toBe(true);

      // Verify the stream was created with draft flag
      const { statusCode: getStatus, body: getBody } = await apiClient.get(
        `api/streams/${childStreamName}`,
        {
          headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
          responseType: 'json',
        }
      );

      expect(getStatus).toBe(200);
      expect(getBody.stream.name).toBe(childStreamName);
      expect(getBody.stream.ingest.wired.draft).toBe(true);
    });

    apiTest(
      'should create a draft stream without materializing ES artifacts',
      async ({ apiClient, samlAuth, esClient }) => {
        const { cookieHeader } = await samlAuth.asStreamsAdmin();
        const childStreamName = `${streamNamePrefix}-no-es`;

        // Create draft stream
        const { statusCode } = await apiClient.post('api/streams/logs/_fork', {
          headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
          body: {
            stream: { name: childStreamName },
            where: { field: 'service.name', eq: 'test-service' },
            status: 'enabled',
            draft: true,
          },
          responseType: 'json',
        });
        expect(statusCode).toBe(200);

        // Verify data stream does not exist - expect getDataStream to throw 404
        const dataStreamCheck = await esClient.indices
          .getDataStream({ name: childStreamName })
          .then(() => ({ exists: true, statusCode: 200 }))
          .catch((error: any) => ({ exists: false, statusCode: error.meta?.statusCode }));

        expect(dataStreamCheck.exists).toBe(false);
        expect(dataStreamCheck.statusCode).toBe(404);
      }
    );

    // Draft stream should have ESQL view created
    apiTest(
      'should create an ESQL view for draft streams',
      async ({ apiClient, samlAuth, esClient }) => {
        const { cookieHeader } = await samlAuth.asStreamsAdmin();
        const childStreamName = `${streamNamePrefix}-esql-view`;

        // Create draft stream
        const { statusCode } = await apiClient.post('api/streams/logs/_fork', {
          headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
          body: {
            stream: { name: childStreamName },
            where: { field: 'service.name', eq: 'test-esql' },
            status: 'enabled',
            draft: true,
          },
          responseType: 'json',
        });
        expect(statusCode).toBe(200);

        // Verify ESQL view exists - the view name format is $.<stream_name>
        const viewName = `$.${childStreamName}`;
        const viewExists = await esClient.esql
          .query({
            query: `FROM ${viewName} | LIMIT 0`,
            format: 'json',
          })
          .then(() => true)
          .catch(() => false);

        expect(viewExists).toBe(true);
      }
    );

    // Draft stream deletion
    apiTest('should delete a draft stream', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asStreamsAdmin();
      const childStreamName = `${streamNamePrefix}-to-delete`;

      // Create draft stream first
      await apiClient.post('api/streams/logs/_fork', {
        headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
        body: {
          stream: { name: childStreamName },
          where: { field: 'service.name', eq: 'to-delete' },
          status: 'enabled',
          draft: true,
        },
        responseType: 'json',
      });

      // Delete the stream
      const { statusCode } = await apiClient.delete(`api/streams/${childStreamName}`, {
        headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
        responseType: 'json',
      });

      expect(statusCode).toBe(200);

      // Verify stream is deleted
      const { statusCode: getStatus } = await apiClient.get(`api/streams/${childStreamName}`, {
        headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
        responseType: 'json',
      });
      expect(getStatus).toBe(404);
    });

    // Non-draft to draft transition (should fail)
    apiTest(
      'should fail to change a non-draft stream to draft',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asStreamsAdmin();
        const childStreamName = `${streamNamePrefix}-non-to-draft`;

        // Create non-draft stream first
        const { statusCode: createStatus } = await apiClient.post('api/streams/logs/_fork', {
          headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
          body: {
            stream: { name: childStreamName },
            where: { field: 'service.name', eq: 'non-draft' },
            status: 'enabled',
            // no draft flag = non-draft
          },
          responseType: 'json',
        });
        expect(createStatus).toBe(200);

        // Get the stream definition
        const { body: getBody } = await apiClient.get(`api/streams/${childStreamName}`, {
          headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
          responseType: 'json',
        });

        // Try to update to draft
        const { updated_at: _, ...processingWithoutUpdatedAt } =
          getBody.stream.ingest.processing || {};
        const { statusCode: updateStatus } = await apiClient.put(
          `api/streams/${childStreamName}/_ingest`,
          {
            headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
            body: {
              ingest: {
                ...getBody.stream.ingest,
                processing: processingWithoutUpdatedAt,
                wired: {
                  ...getBody.stream.ingest.wired,
                  draft: true,
                },
              },
            },
            responseType: 'json',
          }
        );

        expect(updateStatus).toBe(400);
      }
    );

    // Draft to non-draft transition (materialization)
    apiTest(
      'should allow draft to non-draft transition (materialization)',
      async ({ apiClient, samlAuth, esClient }) => {
        const { cookieHeader } = await samlAuth.asStreamsAdmin();
        const childStreamName = `${streamNamePrefix}-materialize`;

        // Create draft stream first
        await apiClient.post('api/streams/logs/_fork', {
          headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
          body: {
            stream: { name: childStreamName },
            where: { field: 'service.name', eq: 'materialize' },
            status: 'enabled',
            draft: true,
          },
          responseType: 'json',
        });

        // Verify it's a draft
        const { body: getBody } = await apiClient.get(`api/streams/${childStreamName}`, {
          headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
          responseType: 'json',
        });
        expect(getBody.stream.ingest.wired.draft).toBe(true);

        // Update to non-draft (materialize)
        const { updated_at: _, ...processingWithoutUpdatedAt } =
          getBody.stream.ingest.processing || {};
        const { statusCode: updateStatus } = await apiClient.put(
          `api/streams/${childStreamName}/_ingest`,
          {
            headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
            body: {
              ingest: {
                ...getBody.stream.ingest,
                processing: processingWithoutUpdatedAt,
                wired: {
                  ...getBody.stream.ingest.wired,
                  draft: false,
                },
              },
            },
            responseType: 'json',
          }
        );

        expect(updateStatus).toBe(200);

        // Verify it's no longer a draft
        const { body: updatedBody } = await apiClient.get(`api/streams/${childStreamName}`, {
          headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
          responseType: 'json',
        });
        expect(Boolean(updatedBody.stream.ingest.wired.draft)).toBe(false);

        // Verify data stream now exists
        const dataStreamResponse = await esClient.indices.getDataStream({ name: childStreamName });
        expect(dataStreamResponse.data_streams).toHaveLength(1);
        expect(dataStreamResponse.data_streams[0].name).toBe(childStreamName);
      }
    );

    // Draft child stream inherits draft from parent when auto-created
    apiTest(
      'should inherit draft status for auto-created child streams',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asStreamsAdmin();
        const parentStreamName = `${streamNamePrefix}-parent`;
        const childStreamName = `${parentStreamName}.child`;

        // Create draft parent
        await apiClient.post('api/streams/logs/_fork', {
          headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
          body: {
            stream: { name: parentStreamName },
            where: { field: 'service.name', eq: 'parent-service' },
            status: 'enabled',
            draft: true,
          },
          responseType: 'json',
        });

        // Get parent stream and add routing to auto-create child
        const { body: parentBody } = await apiClient.get(`api/streams/${parentStreamName}`, {
          headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
          responseType: 'json',
        });

        const { updated_at: _, ...processingWithoutUpdatedAt } =
          parentBody.stream.ingest.processing || {};

        // Update parent with routing to new child
        const { statusCode: updateStatus } = await apiClient.put(
          `api/streams/${parentStreamName}/_ingest`,
          {
            headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
            body: {
              ingest: {
                ...parentBody.stream.ingest,
                processing: processingWithoutUpdatedAt,
                wired: {
                  ...parentBody.stream.ingest.wired,
                  routing: [
                    ...parentBody.stream.ingest.wired.routing,
                    {
                      destination: childStreamName,
                      where: { field: 'log.level', eq: 'error' },
                      status: 'enabled',
                    },
                  ],
                },
              },
            },
            responseType: 'json',
          }
        );
        expect(updateStatus).toBe(200);

        // Verify the auto-created child is also a draft
        const { body: childBody } = await apiClient.get(`api/streams/${childStreamName}`, {
          headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
          responseType: 'json',
        });
        expect(childBody.stream.ingest.wired.draft).toBe(true);
      }
    );

    // Routing order constraint: draft streams must come last
    apiTest(
      'should fail when non-draft stream follows draft in routing order',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asStreamsAdmin();
        const draftChildName = `${streamNamePrefix}-order-draft`;
        const nonDraftChildName = `${streamNamePrefix}-order-nondraft`;

        // Create a draft child first
        await apiClient.post('api/streams/logs/_fork', {
          headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
          body: {
            stream: { name: draftChildName },
            where: { field: 'service.name', eq: 'draft-service' },
            status: 'enabled',
            draft: true,
          },
          responseType: 'json',
        });

        // Create a non-draft child second
        await apiClient.post('api/streams/logs/_fork', {
          headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
          body: {
            stream: { name: nonDraftChildName },
            where: { field: 'service.name', eq: 'nondraft-service' },
            status: 'enabled',
            // non-draft
          },
          responseType: 'json',
        });

        // Get the logs parent stream
        const { body: parentBody } = await apiClient.get('api/streams/logs', {
          headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
          responseType: 'json',
        });

        // Try to reorder routing: draft child first, then non-draft child (invalid)
        const otherRoutes = parentBody.stream.ingest.wired.routing.filter(
          (r: { destination: string }) =>
            r.destination !== draftChildName && r.destination !== nonDraftChildName
        );

        const draftRoute = parentBody.stream.ingest.wired.routing.find(
          (r: { destination: string }) => r.destination === draftChildName
        );
        const nonDraftRoute = parentBody.stream.ingest.wired.routing.find(
          (r: { destination: string }) => r.destination === nonDraftChildName
        );

        // Try invalid order: draft then non-draft
        const invalidRouting = [...otherRoutes, draftRoute, nonDraftRoute];

        const { updated_at: _, ...processingWithoutUpdatedAt } =
          parentBody.stream.ingest.processing || {};
        const { statusCode: updateStatus } = await apiClient.put('api/streams/logs/_ingest', {
          headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
          body: {
            ingest: {
              ...parentBody.stream.ingest,
              processing: processingWithoutUpdatedAt,
              wired: {
                ...parentBody.stream.ingest.wired,
                routing: invalidRouting,
              },
            },
          },
          responseType: 'json',
        });

        expect(updateStatus).toBe(400);
      }
    );

    // Draft parent cannot have non-draft children constraint
    apiTest(
      'should fail when draft stream has non-draft child',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asStreamsAdmin();
        const parentStreamName = `${streamNamePrefix}-draftparent`;
        const nonDraftChildName = `${parentStreamName}.nondraft`;

        // Create draft parent
        await apiClient.post('api/streams/logs/_fork', {
          headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
          body: {
            stream: { name: parentStreamName },
            where: { field: 'service.name', eq: 'parent-service' },
            status: 'enabled',
            draft: true,
          },
          responseType: 'json',
        });

        // Try to create non-draft child of draft parent (should fail)
        const { statusCode } = await apiClient.post(`api/streams/${parentStreamName}/_fork`, {
          headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
          body: {
            stream: { name: nonDraftChildName },
            where: { field: 'log.level', eq: 'error' },
            status: 'enabled',
            draft: false,
          },
          responseType: 'json',
        });

        expect(statusCode).toBe(400);
      }
    );

    // Draft stream field mappings
    apiTest('should persist field mappings for draft streams', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asStreamsAdmin();
      const childStreamName = `${streamNamePrefix}-fields`;

      // Create draft stream
      await apiClient.post('api/streams/logs/_fork', {
        headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
        body: {
          stream: { name: childStreamName },
          where: { field: 'service.name', eq: 'fields-test' },
          status: 'enabled',
          draft: true,
        },
        responseType: 'json',
      });

      // Get the stream
      const { body: getBody } = await apiClient.get(`api/streams/${childStreamName}`, {
        headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
        responseType: 'json',
      });

      // Add field mappings
      const { updated_at: _, ...processingWithoutUpdatedAt } =
        getBody.stream.ingest.processing || {};
      const { statusCode: updateStatus } = await apiClient.put(
        `api/streams/${childStreamName}/_ingest`,
        {
          headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
          body: {
            ingest: {
              ...getBody.stream.ingest,
              processing: processingWithoutUpdatedAt,
              wired: {
                ...getBody.stream.ingest.wired,
                fields: {
                  'attributes.custom_field': { type: 'keyword' },
                  'attributes.numeric_field': { type: 'long' },
                },
              },
            },
          },
          responseType: 'json',
        }
      );

      expect(updateStatus).toBe(200);

      // Verify field mappings were persisted
      const { body: verifyBody } = await apiClient.get(`api/streams/${childStreamName}/_ingest`, {
        headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
        responseType: 'json',
      });

      expect(verifyBody.ingest.wired.draft).toBe(true);
      expect(verifyBody.ingest.wired.fields['attributes.custom_field'].type).toBe('keyword');
      expect(verifyBody.ingest.wired.fields['attributes.numeric_field'].type).toBe('long');
    });

    // Draft stream with processing steps
    apiTest(
      'should persist processing steps for draft streams',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asStreamsAdmin();
        const childStreamName = `${streamNamePrefix}-processing`;

        // Create draft stream
        await apiClient.post('api/streams/logs/_fork', {
          headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
          body: {
            stream: { name: childStreamName },
            where: { field: 'service.name', eq: 'processing-test' },
            status: 'enabled',
            draft: true,
          },
          responseType: 'json',
        });

        // Get the stream
        const { body: getBody } = await apiClient.get(`api/streams/${childStreamName}`, {
          headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
          responseType: 'json',
        });

        // Add processing steps
        const { statusCode: updateStatus } = await apiClient.put(
          `api/streams/${childStreamName}/_ingest`,
          {
            headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
            body: {
              ingest: {
                ...getBody.stream.ingest,
                processing: {
                  steps: [{ action: 'set', to: 'attributes.processed', value: 'true' }],
                },
                wired: getBody.stream.ingest.wired,
              },
            },
            responseType: 'json',
          }
        );

        expect(updateStatus).toBe(200);

        // Verify processing steps were persisted
        const { body: verifyBody } = await apiClient.get(`api/streams/${childStreamName}/_ingest`, {
          headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
          responseType: 'json',
        });

        expect(verifyBody.ingest.wired.draft).toBe(true);
        expect(verifyBody.ingest.processing.steps).toHaveLength(1);
        expect(verifyBody.ingest.processing.steps[0].action).toBe('set');
      }
    );

    // Simulate processing on draft stream
    apiTest(
      'should simulate processing on draft stream using documents from parent',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asStreamsAdmin();
        const childStreamName = `${streamNamePrefix}-simulate`;

        // Create draft stream
        await apiClient.post('api/streams/logs/_fork', {
          headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
          body: {
            stream: { name: childStreamName },
            where: { field: 'service.name', eq: 'simulate-test' },
            status: 'enabled',
            draft: true,
          },
          responseType: 'json',
        });

        // Simulate processing with sample documents
        // Since draft streams don't have their own data stream, the simulation
        // should work by using the parent stream's index state
        const { statusCode: simStatus, body: simBody } = await apiClient.post(
          `api/streams/${childStreamName}/processing/_simulate`,
          {
            headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
            body: {
              processing: {
                steps: [{ action: 'set', to: 'attributes.simulated', value: 'yes' }],
              },
              documents: [
                {
                  message: 'test message',
                  'service.name': 'simulate-test',
                },
              ],
            },
            responseType: 'json',
          }
        );

        // The simulation should succeed even though the draft stream has no data stream
        expect(simStatus).toBe(200);
        // Verify the simulation processed the document
        expect(simBody.documents).toHaveLength(1);
        expect(simBody.documents[0].value['attributes.simulated']).toBe('yes');
      }
    );

    // Multiple sibling draft streams
    apiTest('should create multiple sibling draft streams', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asStreamsAdmin();
      const sibling1 = `${streamNamePrefix}-sibling1`;
      const sibling2 = `${streamNamePrefix}-sibling2`;

      // Create two draft sibling streams
      for (const [streamName, serviceName] of [
        [sibling1, 'service-a'],
        [sibling2, 'service-b'],
      ]) {
        const { statusCode } = await apiClient.post('api/streams/logs/_fork', {
          headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
          body: {
            stream: { name: streamName },
            where: { field: 'service.name', eq: serviceName },
            status: 'enabled',
            draft: true,
          },
          responseType: 'json',
        });
        expect(statusCode).toBe(200);
      }

      // Verify both are drafts
      for (const streamName of [sibling1, sibling2]) {
        const { body } = await apiClient.get(`api/streams/${streamName}`, {
          headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
          responseType: 'json',
        });
        expect(body.stream.ingest.wired.draft).toBe(true);
      }
    });

    // Nested draft streams (2 levels)
    apiTest('should create nested draft streams (2 levels)', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asStreamsAdmin();
      const level1Stream = `${streamNamePrefix}-level1`;
      const level2Stream = `${level1Stream}.level2`;

      // Create first level draft child
      await apiClient.post('api/streams/logs/_fork', {
        headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
        body: {
          stream: { name: level1Stream },
          where: { field: 'service.name', eq: 'level1' },
          status: 'enabled',
          draft: true,
        },
        responseType: 'json',
      });

      // Create second level draft child (forked from level1)
      const { statusCode } = await apiClient.post(`api/streams/${level1Stream}/_fork`, {
        headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
        body: {
          stream: { name: level2Stream },
          where: { field: 'log.level', eq: 'error' },
          status: 'enabled',
          draft: true,
        },
        responseType: 'json',
      });

      expect(statusCode).toBe(200);

      // Verify both streams are drafts
      const { body: l1Body } = await apiClient.get(`api/streams/${level1Stream}`, {
        headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
        responseType: 'json',
      });
      expect(l1Body.stream.ingest.wired.draft).toBe(true);

      const { body: l2Body } = await apiClient.get(`api/streams/${level2Stream}`, {
        headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
        responseType: 'json',
      });
      expect(l2Body.stream.ingest.wired.draft).toBe(true);
    });

    // Update routing condition on draft stream's parent
    apiTest('should update routing condition for draft stream', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asStreamsAdmin();
      const childStreamName = `${streamNamePrefix}-upd-route`;

      // Create draft stream
      await apiClient.post('api/streams/logs/_fork', {
        headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
        body: {
          stream: { name: childStreamName },
          where: { field: 'service.name', eq: 'original-service' },
          status: 'enabled',
          draft: true,
        },
        responseType: 'json',
      });

      // Get the parent stream
      const { body: parentBody } = await apiClient.get('api/streams/logs', {
        headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
        responseType: 'json',
      });

      // Update the routing condition
      const updatedRouting = parentBody.stream.ingest.wired.routing.map(
        (rule: { destination: string; where: any; status: string }) => {
          if (rule.destination === childStreamName) {
            return {
              ...rule,
              where: { field: 'service.name', eq: 'updated-service' },
            };
          }
          return rule;
        }
      );

      const { updated_at: _, ...processingWithoutUpdatedAt } =
        parentBody.stream.ingest.processing || {};
      const { statusCode: updateStatus } = await apiClient.put('api/streams/logs/_ingest', {
        headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
        body: {
          ingest: {
            ...parentBody.stream.ingest,
            processing: processingWithoutUpdatedAt,
            wired: {
              ...parentBody.stream.ingest.wired,
              routing: updatedRouting,
            },
          },
        },
        responseType: 'json',
      });

      expect(updateStatus).toBe(200);

      // Verify the routing was updated
      const { body: verifyBody } = await apiClient.get('api/streams/logs', {
        headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
        responseType: 'json',
      });

      const updatedRule = verifyBody.stream.ingest.wired.routing.find(
        (r: { destination: string }) => r.destination === childStreamName
      );
      expect(updatedRule.where.eq).toBe('updated-service');

      // Verify the child is still a draft
      const { body: childBody } = await apiClient.get(`api/streams/${childStreamName}`, {
        headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
        responseType: 'json',
      });
      expect(childBody.stream.ingest.wired.draft).toBe(true);
    });

    // Disabling routing rule for draft stream
    apiTest(
      'should allow disabling routing rule for draft stream',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asStreamsAdmin();
        const childStreamName = `${streamNamePrefix}-disable-route`;

        // Create draft stream with enabled status
        await apiClient.post('api/streams/logs/_fork', {
          headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
          body: {
            stream: { name: childStreamName },
            where: { field: 'service.name', eq: 'disable-test' },
            status: 'enabled',
            draft: true,
          },
          responseType: 'json',
        });

        // Get parent stream
        const { body: parentBody } = await apiClient.get('api/streams/logs', {
          headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
          responseType: 'json',
        });

        // Update status to disabled
        const updatedRouting = parentBody.stream.ingest.wired.routing.map(
          (rule: { destination: string; where: any; status: string }) => {
            if (rule.destination === childStreamName) {
              return { ...rule, status: 'disabled' };
            }
            return rule;
          }
        );

        const { updated_at: _, ...processingWithoutUpdatedAt } =
          parentBody.stream.ingest.processing || {};
        const { statusCode: updateStatus } = await apiClient.put('api/streams/logs/_ingest', {
          headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
          body: {
            ingest: {
              ...parentBody.stream.ingest,
              processing: processingWithoutUpdatedAt,
              wired: {
                ...parentBody.stream.ingest.wired,
                routing: updatedRouting,
              },
            },
          },
          responseType: 'json',
        });

        expect(updateStatus).toBe(200);

        // Verify status was updated
        const { body: verifyBody } = await apiClient.get('api/streams/logs', {
          headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
          responseType: 'json',
        });

        const updatedRule = verifyBody.stream.ingest.wired.routing.find(
          (r: { destination: string }) => r.destination === childStreamName
        );
        expect(updatedRule.status).toBe('disabled');
      }
    );

    // E2E test: Index data, create draft stream, query via ESQL view
    apiTest(
      'should query indexed data through draft stream ESQL view',
      async ({ apiClient, samlAuth, esClient }) => {
        const { cookieHeader } = await samlAuth.asStreamsAdmin();
        const childStreamName = `${streamNamePrefix}-esql-e2e`;
        const testServiceName = `draft-e2e-test-service-${Date.now()}`;

        // Step 1: Index test documents into the 'logs' stream
        // These documents have a unique service.name to isolate them from other tests
        const testDocs = [
          {
            '@timestamp': new Date().toISOString(),
            message: 'Test message 1 for draft ESQL view',
            'service.name': testServiceName,
            'log.level': 'info',
          },
          {
            '@timestamp': new Date().toISOString(),
            message: 'Test message 2 for draft ESQL view',
            'service.name': testServiceName,
            'log.level': 'error',
          },
          {
            '@timestamp': new Date().toISOString(),
            message: 'Test message 3 - different service',
            'service.name': 'other-service',
            'log.level': 'info',
          },
        ];

        // Index all test documents
        for (const doc of testDocs) {
          await esClient.index({
            index: 'logs',
            document: doc,
            refresh: true,
          });
        }

        // Step 2: Create a draft child stream with routing condition
        const { statusCode: forkStatus } = await apiClient.post('api/streams/logs/_fork', {
          headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
          body: {
            stream: { name: childStreamName },
            where: { field: 'service.name', eq: testServiceName },
            status: 'enabled',
            draft: true,
          },
          responseType: 'json',
        });
        expect(forkStatus).toBe(200);

        // Verify it's a draft stream
        const { body: streamBody } = await apiClient.get(`api/streams/${childStreamName}`, {
          headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
          responseType: 'json',
        });
        expect(streamBody.stream.ingest.wired.draft).toBe(true);

        // Step 3: Query the draft stream's ESQL view
        // The view name format is $.<stream_name>
        const viewName = `$.${childStreamName}`;

        // Query the ESQL view and verify it returns the filtered data
        const esqlResult = await esClient.esql.query({
          query: `FROM ${viewName} | KEEP message, \`service.name\`, \`log.level\` | SORT message ASC`,
          format: 'json',
        });

        // The query result should contain only documents matching the routing condition
        // (service.name == testServiceName), so 2 documents, not 3
        const rows = esqlResult.values as string[][];
        expect(rows.length).toBe(2);

        // Verify the correct documents are returned (those with our test service name)
        const messages = rows.map((row) => row[0]);
        expect(messages).toContain('Test message 1 for draft ESQL view');
        expect(messages).toContain('Test message 2 for draft ESQL view');
        expect(messages).not.toContain('Test message 3 - different service');

        // Verify the service.name values are correct
        const serviceNames = rows.map((row) => row[1]);
        expect(serviceNames.every((name) => name === testServiceName)).toBe(true);
      }
    );
  }
);
