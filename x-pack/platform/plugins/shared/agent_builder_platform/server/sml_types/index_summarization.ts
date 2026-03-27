
import { Logger } from '@kbn/core/server';
import { SmlContext, SmlData, SmlTypeDefinition } from '@kbn/agent-builder-plugin/server';
import { SmlDocument, SmlToAttachmentContext } from '@kbn/agent-builder-plugin/server/services/sml/types';
import { AttachmentInput } from '@kbn/agent-builder-common/attachments';
import { EsqlColumn } from '@elastic/elasticsearch/lib/helpers';

const INDEX_SUMMARIZATION_SML_TYPE = 'index_summarization';

interface IndexSummarizationSmlTypeDeps {
    logger: Logger;
}

export const createIndexSummarizationSmlType = (deps: IndexSummarizationSmlTypeDeps): SmlTypeDefinition => {
    return {
        id: INDEX_SUMMARIZATION_SML_TYPE,
        list: (_context) => {
            // No listing — items are created via events, not crawling
            return {
                [Symbol.asyncIterator]: () => ({ next: async () => ({ done: true as const, value: [] }) }),
            };
        },
        getSmlData: async (originId: string, context: SmlContext): Promise<SmlData | undefined> => {
            if (!context.request) {
                throw new Error(`SML index_summarization: no request available for '${originId}' — cannot create scoped client` );
            }

            const index = await context.esClient.indices.get({ index: originId });
            const mappings = index[originId].mappings?.properties;
            const settings = index[originId].settings;
            const aliases = index[originId].aliases;
            const fieldCaps = await context.esClient.fieldCaps({ index: originId, fields: '*' });

            const fieldsToKeep = [];
            for (const fieldName in mappings) {
                if (mappings[fieldName].type !== 'keyword' && mappings[fieldName].type !== 'text') {
                    continue; 
                }
                fieldsToKeep.push(fieldName);
            }

            const sampleDocsQuery = `FROM ${originId} | SAMPLE 0.25 | LIMIT 20`; // todo - make limit configuratble
            const sampleDocs = await context.esClient.esql.query({
                query: sampleDocsQuery,
            });
            const sampleDocuments: Record<string, any>[] = [];
            if (sampleDocs.columns && sampleDocs.values) {
                const columnNames = (sampleDocs.columns as EsqlColumn[]).map(col => col.name);
                for (const row of sampleDocs.values) {
                    const doc: Record<string, any> = {};
                    for (let i = 0; i < columnNames.length; i++) {
                        const colName = columnNames[i];
                        if (fieldsToKeep.includes(colName)) {
                            doc[colName] = row[i];
                        }
                    }
                    sampleDocuments.push(doc);
                }
            }

            const summaryPrompt = `
You are given a set of document values for different fields in an Elasticsearch index, along with the index mapping that describes the field types and structure.
The index mapping is in JSON format and includes the field names, types, and any nested structures.
Using this information, provide a final summary of the index as a whole.
Identify the overall themes and topics represented in the index, the types of data contained.
Consider how the different fields relate to each other and what insights can be drawn about the nature of the data in the index.
Do not give any specific examples from the field summaries, only summarize the findings.
Provide a list of up to the top 10 most interesting or unique fields in the index based on the summaries, and explain why they are notable.
Keep the summary concise but informative, ideally no more than 5 sentences.

Index Aliases: ${aliases}

Index Mappings:
${mappings}

Index Settings: 
${settings}

Field capabilities:
${fieldCaps}

Sample documents: 
${JSON.stringify(sampleDocuments, null, 2)}
            `;

            // TODO - call out to LLM with summaryPrompt and return the response as part of SmlData

            return undefined; // TODO: Implement logic to fetch index summarization data
        },
        toAttachment: async (item: SmlDocument, context: SmlToAttachmentContext): Promise<AttachmentInput<string, unknown> | undefined> => {
            // TODO: Implement logic to convert index summarization data to attachment format
            return undefined;
        }
    };
};
