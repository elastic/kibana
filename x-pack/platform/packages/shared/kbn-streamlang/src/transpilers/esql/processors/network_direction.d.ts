import type { ESQLAstCommand } from '@elastic/esql/types';
import type { NetworkDirectionProcessor } from '../../../../types/processors';
/**
 * Converts a Streamlang NetworkDirectionProcessor into a list of ES|QL AST commands.
 *
 * @param processor - The NetworkDirectionProcessor to convert
 * @returns A list of ES|QL AST commands
 * @example
 * Input:
 * ```
 * {
 *   source_ip: '128.232.110.120',
 *   destination_ip: '192.168.1.1',
 *   internal_networks: ['private'],
 * }
 * ```
 * Output:
 * ```
 * | EVAL network.direction = NETWORK_DIRECTION('128.232.110.120', '192.168.1.1', ['private'])
 */
export declare const convertNetworkDirectionProcessorToESQL: (processor: NetworkDirectionProcessor) => ESQLAstCommand[];
