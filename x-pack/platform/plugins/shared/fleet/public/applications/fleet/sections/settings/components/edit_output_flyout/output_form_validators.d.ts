import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { validateSslPathInput, validateSslPathsCombo } from '../ssl_form_validators';
export { validateSslPathInput, validateSslPathsCombo };
export declare function validateKafkaHosts(value: string[]): {
    message: string;
    index?: number;
}[] | undefined;
export declare function validateESHosts(value: string[]): {
    message: string;
    index?: number;
}[] | undefined;
export declare function validateLogstashHosts(value: string[]): {
    message: string;
    index?: number;
}[] | undefined;
export type YamlParseFn = (value: string) => unknown;
export declare const createValidateYamlConfig: (parse: YamlParseFn) => (value: string) => string[] | undefined;
export declare function validateName(value: string): string[] | undefined;
export declare function validateKibanaURL(val: string, syncEnabled: boolean): string[] | undefined;
export declare function validateKafkaUsername(value: string): string[] | undefined;
export declare function validateKafkaPassword(value: string): string[] | undefined;
export declare const validateKafkaPasswordSecret: (value: string | {
    id: string;
} | undefined) => string[] | undefined;
export declare function validateCATrustedFingerPrint(value: string): string[] | undefined;
export declare function validateServiceToken(value: string): string[] | undefined;
export declare const validateServiceTokenSecret: (value: string | {
    id: string;
} | undefined) => string[] | undefined;
export declare function validateKibanaAPIKey(value: string): string[] | undefined;
export declare const validateKibanaAPIKeySecret: (value: string | {
    id: string;
} | undefined) => string[] | undefined;
export declare function validateSSLCertificate(value: string): string[] | undefined;
export declare function validateSSLKey(value: string): string[] | undefined;
export declare const validateSSLKeySecret: (value: string | {
    id: string;
} | undefined) => string[] | undefined;
export declare function validateKafkaStaticTopic(value: string): string[] | undefined;
export declare function validateDynamicKafkaTopics(value: Array<EuiComboBoxOptionOption<string>>): string[] | undefined;
export declare function validateKafkaClientId(value: string): string[] | undefined;
export declare function validateKafkaPartitioningGroupEvents(value: string): string[] | undefined;
export declare function validateKafkaHeaders(pairs: Array<{
    key: string;
    value: string;
}>): {
    message: string;
    index: number;
    hasKeyError: boolean;
    hasValueError: boolean;
}[] | undefined;
