import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { CpsData } from '../types';
/**
 * Resolves the CPS scope metadata (routing expression + linked projects) recorded on alert
 * documents and the event log.
 *
 * The two Elasticsearch endpoints require different principals:
 * - `/_project_routing/{npre}` resolves the space's routing expression. It is space configuration,
 *   identical for every principal, and an operator-only endpoint, so it is called with the
 *   internal (operator) user. This is reliable and avoids the `security_exception` a rule's scoped
 *   API key would otherwise raise (see #276771).
 * - `/_project/tags` returns the linked projects visible to the caller (role-filtered). To reflect
 *   the scope the rule execution actually targets (its owner's project visibility), it is called as
 *   the current user. If the rule's API key lacks the privilege the call fails silently, so linked
 *   projects are reported as empty rather than over-reported.
 */
export declare const resolveCpsData: (internalUserEsClient: ElasticsearchClient, currentUserEsClient: ElasticsearchClient, spaceId: string, logger: Logger) => Promise<CpsData>;
