/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState } from 'react';

import { i18n } from '@kbn/i18n';
import { load } from 'js-yaml';

import type { EuiComboBoxOptionOption } from '@elastic/eui';

import { getDefaultPresetForEsOutput } from '../../../../../../../common/services/output_helpers';

import type {
  KafkaOutput,
  NewElasticsearchOutput,
  NewLogstashOutput,
  NewOutput,
  NewRemoteElasticsearchOutput,
} from '../../../../../../../common/types/models';

import {
  kafkaAcknowledgeReliabilityLevel,
  kafkaAuthType,
  kafkaCompressionType,
  kafkaConnectionType,
  kafkaPartitionType,
  kafkaSaslMechanism,
  kafkaTopicsType,
  kafkaVerificationModes,
  outputType,
} from '../../../../../../../common/constants';

import {
  sendPostOutput,
  useComboInput,
  useInput,
  useSecretInput,
  useNumberInput,
  useSelectInput,
  useSwitchInput,
  useStartServices,
  useFleetStatus,
  useRadioInput,
  sendPutOutput,
  useKeyValueInput,
  useAuthz,
  useComboBoxWithCustomInput,
} from '../../../../hooks';
import type { Output } from '../../../../types';
import { useConfirmModal } from '../../hooks/use_confirm_modal';
import { ExperimentalFeaturesService } from '../../../../services';

import {
  validateName,
  validateESHosts,
  validateLogstashHosts,
  validateYamlConfig,
  validateCATrustedFingerPrint,
  validateServiceToken,
  validateServiceTokenSecret,
  validateSSLCertificate,
  validateSSLKey,
  validateSSLKeySecret,
  validateKafkaUsername,
  validateKafkaPassword,
  validateKafkaPasswordSecret,
  validateKafkaHeaders,
  validateKafkaStaticTopic,
  validateKafkaClientId,
  validateKafkaHosts,
  validateKafkaPartitioningGroupEvents,
  validateDynamicKafkaTopics,
  validateKibanaURL,
  validateKibanaAPIKey,
  validateKibanaAPIKeySecret,
} from './output_form_validators';
import { confirmUpdate } from './confirm_update';

const DEFAULT_QUEUE_MAX_SIZE = 4096;

export interface OutputFormInputsType {
  nameInput: ReturnType<typeof useInput>;
  typeInput: ReturnType<typeof useInput>;
  elasticsearchUrlInput: ReturnType<typeof useComboInput>;
  diskQueueEnabledInput: ReturnType<typeof useSwitchInput>;
  diskQueuePathInput: ReturnType<typeof useInput>;
  diskQueueMaxSizeInput: ReturnType<typeof useNumberInput>;
  diskQueueEncryptionEnabled: ReturnType<typeof useSwitchInput>;
  diskQueueCompressionEnabled: ReturnType<typeof useSwitchInput>;
  compressionLevelInput: ReturnType<typeof useSelectInput>;
  logstashHostsInput: ReturnType<typeof useComboInput>;
  presetInput: ReturnType<typeof useInput>;
  additionalYamlConfigInput: ReturnType<typeof useInput>;
  defaultOutputInput: ReturnType<typeof useSwitchInput>;
  defaultMonitoringOutputInput: ReturnType<typeof useSwitchInput>;
  caTrustedFingerprintInput: ReturnType<typeof useInput>;
  serviceTokenInput: ReturnType<typeof useInput>;
  serviceTokenSecretInput: ReturnType<typeof useSecretInput>;
  syncIntegrationsInput: ReturnType<typeof useSwitchInput>;
  kibanaURLInput: ReturnType<typeof useInput>;
  kibanaAPIKeyInput: ReturnType<typeof useInput>;
  kibanaAPIKeySecretInput: ReturnType<typeof useSecretInput>;
  sslCertificateInput: ReturnType<typeof useInput>;
  sslKeyInput: ReturnType<typeof useInput>;
  sslKeySecretInput: ReturnType<typeof useSecretInput>;
  sslCertificateAuthoritiesInput: ReturnType<typeof useComboInput>;
  proxyIdInput: ReturnType<typeof useInput>;
  loadBalanceEnabledInput: ReturnType<typeof useSwitchInput>;
  memQueueEvents: ReturnType<typeof useNumberInput>;
  queueFlushTimeout: ReturnType<typeof useNumberInput>;
  maxBatchBytes: ReturnType<typeof useNumberInput>;
  kafkaHostsInput: ReturnType<typeof useComboInput>;
  kafkaVersionInput: ReturnType<typeof useInput>;
  kafkaVerificationModeInput: ReturnType<typeof useInput>;
  kafkaAuthMethodInput: ReturnType<typeof useRadioInput>;
  kafkaConnectionTypeInput: ReturnType<typeof useRadioInput>;
  kafkaSaslMechanismInput: ReturnType<typeof useRadioInput>;
  kafkaAuthUsernameInput: ReturnType<typeof useInput>;
  kafkaAuthPasswordInput: ReturnType<typeof useInput>;
  kafkaAuthPasswordSecretInput: ReturnType<typeof useSecretInput>;
  kafkaPartitionTypeInput: ReturnType<typeof useRadioInput>;
  kafkaPartitionTypeRandomInput: ReturnType<typeof useInput>;
  kafkaPartitionTypeHashInput: ReturnType<typeof useInput>;
  kafkaPartitionTypeRoundRobinInput: ReturnType<typeof useInput>;
  kafkaHeadersInput: ReturnType<typeof useKeyValueInput>;
  kafkaClientIdInput: ReturnType<typeof useInput>;
  kafkaTopicsInput: ReturnType<typeof useRadioInput>;
  kafkaStaticTopicInput: ReturnType<typeof useInput>;
  kafkaDynamicTopicInput: ReturnType<typeof useComboBoxWithCustomInput>;
  kafkaCompressionInput: ReturnType<typeof useSwitchInput>;
  kafkaCompressionLevelInput: ReturnType<typeof useInput>;
  kafkaCompressionCodecInput: ReturnType<typeof useInput>;
  kafkaBrokerTimeoutInput: ReturnType<typeof useInput>;
  kafkaBrokerReachabilityTimeoutInput: ReturnType<typeof useInput>;
  kafkaBrokerAckReliabilityInput: ReturnType<typeof useInput>;
  kafkaKeyInput: ReturnType<typeof useInput>;
  kafkaSslCertificateInput: ReturnType<typeof useInput>;
  kafkaSslKeyInput: ReturnType<typeof useInput>;
  kafkaSslKeySecretInput: ReturnType<typeof useSecretInput>;
  kafkaSslCertificateAuthoritiesInput: ReturnType<typeof useComboInput>;
}

function extractKafkaOutputSecrets(
  inputs: Pick<
    OutputFormInputsType,
    | 'kafkaSslKeyInput'
    | 'kafkaSslKeySecretInput'
    | 'kafkaAuthPasswordInput'
    | 'kafkaAuthPasswordSecretInput'
  >
): KafkaOutput['secrets'] | null {
  const secrets: KafkaOutput['secrets'] = {};

  if (!inputs.kafkaSslKeyInput.value && inputs.kafkaSslKeySecretInput.value) {
    secrets.ssl = {
      key: inputs.kafkaSslKeySecretInput.value,
    };
  }

  if (!inputs.kafkaAuthPasswordInput.value && inputs.kafkaAuthPasswordSecretInput.value) {
    secrets.password = inputs.kafkaAuthPasswordSecretInput.value;
  }

  return Object.keys(secrets).length ? secrets : null;
}

export function extractDefaultStaticKafkaTopic(o: KafkaOutput): string {
  if (o?.topic?.includes('%{[')) {
    return '';
  }

  return o?.topic || '';
}

export function extractDefaultDynamicKafkaTopics(
  o: KafkaOutput
): Array<EuiComboBoxOptionOption<string>> {
  if (!o?.topic || (o?.topic && !o.topic?.includes('%{['))) {
    return [];
  }
  const matched = o.topic.match(/(%\{\[)(\S*)(\]\})/);
  const parsed = matched?.length ? matched[2] : '';

  return [
    {
      label: parsed,
      value: parsed,
    },
  ];
}

export function useOutputForm(onSucess: () => void, output?: Output, defaultOuput?: Output) {
  const fleetStatus = useFleetStatus();
  const authz = useAuthz();

  const { showExperimentalShipperOptions } = ExperimentalFeaturesService.get();

  const hasEncryptedSavedObjectConfigured = !fleetStatus.missingOptionalFeatures?.includes(
    'encrypted_saved_object_encryption_key_required'
  );

  const [isLoading, setIsloading] = useState(false);
  const { notifications, cloud } = useStartServices();
  const { confirm } = useConfirmModal();

  // preconfigured output do not allow edition
  const isPreconfigured = output?.is_preconfigured ?? false;
  const allowEdit = output?.allow_edit ?? [];

  function isDisabled(
    field: keyof Output | keyof KafkaOutput | keyof NewRemoteElasticsearchOutput
  ) {
    if (!authz.fleet.allSettings) {
      return true;
    }

    if (!isPreconfigured) {
      return false;
    }

    return !allowEdit.includes(field);
  }

  // Define inputs
  // Shared inputs
  const nameInput = useInput(output?.name ?? '', validateName, isDisabled('name'));
  const typeInput = useInput(output?.type ?? 'elasticsearch', undefined, isDisabled('type'));
  const additionalYamlConfigInput = useInput(
    output?.config_yaml ?? '',
    validateYamlConfig,
    isDisabled('config_yaml')
  );

  const defaultOutputInput = useSwitchInput(
    output?.is_default ?? false,
    isDisabled('is_default') || output?.is_default
  );
  const defaultMonitoringOutputInput = useSwitchInput(
    output?.is_default_monitoring ?? false,
    isDisabled('is_default_monitoring') || output?.is_default_monitoring
  );

  // ES inputs
  const caTrustedFingerprintInput = useInput(
    output?.ca_trusted_fingerprint ?? '',
    validateCATrustedFingerPrint,
    isDisabled('ca_trusted_fingerprint')
  );
  // ES output's host URL is restricted to default in serverless
  const isServerless = cloud?.isServerlessEnabled;
  // Set the hosts to default for new ES output in serverless.
  const elasticsearchUrlDefaultValue =
    isServerless && !output?.hosts ? defaultOuput?.hosts || [] : output?.hosts || [];
  const elasticsearchUrlDisabled = isServerless || isDisabled('hosts');
  const elasticsearchUrlInput = useComboInput(
    'esHostsComboxBox',
    elasticsearchUrlDefaultValue,
    validateESHosts,
    elasticsearchUrlDisabled
  );

  const presetInput = useInput(
    output?.preset ?? getDefaultPresetForEsOutput(output?.config_yaml ?? '', load),
    () => undefined,
    isDisabled('preset')
  );

  // Remote ES inputs
  const serviceTokenInput = useInput(
    (output as NewRemoteElasticsearchOutput)?.service_token ?? '',
    validateServiceToken,
    isDisabled('service_token')
  );

  const serviceTokenSecretInput = useSecretInput(
    (output as NewRemoteElasticsearchOutput)?.secrets?.service_token ?? '',
    validateServiceTokenSecret,
    isDisabled('service_token')
  );

  const syncIntegrationsInput = useSwitchInput(
    (output as NewRemoteElasticsearchOutput)?.sync_integrations ?? false,
    isDisabled('sync_integrations')
  );

  const kibanaAPIKeyInput = useInput(
    (output as NewRemoteElasticsearchOutput)?.kibana_api_key ?? '',
    syncIntegrationsInput.value ? validateKibanaAPIKey : undefined,
    isDisabled('kibana_api_key')
  );

  const kibanaAPIKeySecretInput = useSecretInput(
    (output as NewRemoteElasticsearchOutput)?.secrets?.kibana_api_key ?? '',
    syncIntegrationsInput.value ? validateKibanaAPIKeySecret : undefined,
    isDisabled('kibana_api_key')
  );

  const kibanaURLInput = useInput(
    (output as NewRemoteElasticsearchOutput)?.kibana_url ?? '',
    (val) => validateKibanaURL(val, syncIntegrationsInput.value),
    isDisabled('kibana_url')
  );
  /*
  Shipper feature flag - currently depends on the content of the yaml
  # Enables the shipper:
  shipper: {}

  # Also enables the shipper:
  shipper:
    enabled: true

  # Yet another way of enabling it:
  shipper:
    queue:
      ...

  # Disables the shipper
  shipper:
    enabled: false
  */
  const configJs = output?.config_yaml ? load(output?.config_yaml) : {};
  const isShipperDisabled = !configJs?.shipper || configJs?.shipper?.enabled === false;

  const diskQueueEnabledInput = useSwitchInput(output?.shipper?.disk_queue_enabled ?? false);
  const diskQueuePathInput = useInput(
    output?.shipper?.disk_queue_path ?? '',
    undefined,
    !diskQueueEnabledInput.value ?? false
  );
  const diskQueueMaxSizeInput = useNumberInput(
    output?.shipper?.disk_queue_max_size ?? DEFAULT_QUEUE_MAX_SIZE,
    undefined,
    !diskQueueEnabledInput.value ?? false
  );
  const diskQueueEncryptionEnabled = useSwitchInput(
    output?.shipper?.disk_queue_encryption_enabled ?? false,
    !diskQueueEnabledInput.value ?? false
  );
  const loadBalanceEnabledInput = useSwitchInput(output?.shipper?.disk_queue_enabled ?? false);
  const diskQueueCompressionEnabled = useSwitchInput(
    output?.shipper?.disk_queue_compression_enabled ?? false
  );

  const options = Array.from(Array(10).keys())
    .slice(1)
    .map((val) => {
      return { value: `${val}`, text: `Level ${val}` };
    });
  const compressionLevelInput = useSelectInput(
    options,
    `${output?.shipper?.compression_level}` ?? options[0].value,
    !diskQueueCompressionEnabled.value ?? false
  );

  const memQueueEvents = useNumberInput(output?.shipper?.mem_queue_events || undefined);
  const queueFlushTimeout = useNumberInput(output?.shipper?.queue_flush_timeout || undefined);
  const maxBatchBytes = useNumberInput(output?.shipper?.max_batch_bytes || undefined);

  const isSSLEditable = isDisabled('ssl');
  // Logstash inputs
  const logstashHostsInput = useComboInput(
    'logstashHostsComboxBox',
    output?.hosts ?? [],
    validateLogstashHosts,
    isDisabled('hosts')
  );
  const sslCertificateAuthoritiesInput = useComboInput(
    'sslCertificateAuthoritiesComboxBox',
    output?.ssl?.certificate_authorities ?? [],
    undefined,
    isSSLEditable
  );
  const sslCertificateInput = useInput(
    output?.ssl?.certificate ?? '',
    validateSSLCertificate,
    isSSLEditable
  );
  const sslKeyInput = useInput(output?.ssl?.key ?? '', validateSSLKey, isSSLEditable);

  const sslKeySecretInput = useSecretInput(
    (output as NewLogstashOutput)?.secrets?.ssl?.key,
    validateSSLKeySecret,
    isSSLEditable
  );

  const proxyIdInput = useInput(output?.proxy_id ?? '', () => undefined, isDisabled('proxy_id'));

  /**
   * Kafka inputs
   */

  const kafkaOutput = output as KafkaOutput;

  const kafkaVersionInput = useInput(
    kafkaOutput?.version ?? '1.0.0',
    undefined,
    isDisabled('version')
  );

  const kafkaHostsInput = useComboInput(
    'kafkaHostsComboBox',
    output?.hosts ?? [],
    validateKafkaHosts,
    isDisabled('hosts')
  );

  const kafkaAuthMethodInput = useRadioInput(
    kafkaOutput?.auth_type ?? kafkaAuthType.None,
    isDisabled('auth_type')
  );

  const kafkaConnectionTypeInput = useRadioInput(
    kafkaOutput?.connection_type ?? kafkaConnectionType.Plaintext,
    isDisabled('connection_type')
  );

  const kafkaAuthUsernameInput = useInput(
    kafkaOutput?.username ?? undefined,
    kafkaAuthMethodInput.value === kafkaAuthType.Userpass ? validateKafkaUsername : undefined,
    isDisabled('username')
  );
  const kafkaAuthPasswordInput = useInput(
    kafkaOutput?.password ?? undefined,
    kafkaAuthMethodInput.value === kafkaAuthType.Userpass ? validateKafkaPassword : undefined,
    isDisabled('password')
  );

  const kafkaAuthPasswordSecretInput = useSecretInput(
    kafkaOutput?.secrets?.password,
    kafkaAuthMethodInput.value === kafkaAuthType.Userpass ? validateKafkaPasswordSecret : undefined,
    isDisabled('password')
  );

  const kafkaSslCertificateAuthoritiesInput = useComboInput(
    'kafkaSslCertificateAuthoritiesComboBox',
    kafkaOutput?.ssl?.certificate_authorities ?? [],
    undefined,
    isSSLEditable
  );
  const kafkaSslCertificateInput = useInput(
    kafkaOutput?.ssl?.certificate,
    kafkaAuthMethodInput.value === kafkaAuthType.Ssl ? validateSSLCertificate : undefined,
    isSSLEditable
  );
  const kafkaSslKeyInput = useInput(
    kafkaOutput?.ssl?.key,
    kafkaAuthMethodInput.value === kafkaAuthType.Ssl ? validateSSLKey : undefined,
    isSSLEditable
  );

  const kafkaSslKeySecretInput = useSecretInput(
    kafkaOutput?.secrets?.ssl?.key,
    kafkaAuthMethodInput.value === kafkaAuthType.Ssl ? validateSSLKeySecret : undefined,
    isSSLEditable
  );

  const kafkaVerificationModeInput = useInput(
    kafkaOutput?.ssl?.verification_mode ?? kafkaVerificationModes.Full,
    undefined,
    isSSLEditable
  );

  const kafkaSaslMechanismInput = useRadioInput(
    kafkaOutput?.sasl?.mechanism ?? kafkaSaslMechanism.Plain,
    isDisabled('sasl')
  );

  const kafkaPartitionTypeInput = useRadioInput(
    kafkaOutput?.partition ?? kafkaPartitionType.Random,
    isDisabled('partition')
  );

  const kafkaPartitionTypeRandomInput = useInput(
    kafkaOutput?.random?.group_events ? `${kafkaOutput.random.group_events}` : '1',
    kafkaPartitionTypeInput.value === kafkaPartitionType.Random
      ? validateKafkaPartitioningGroupEvents
      : undefined,
    isDisabled('partition')
  );
  const kafkaPartitionTypeHashInput = useInput(
    kafkaOutput?.hash?.hash,
    undefined,
    isDisabled('partition')
  );
  const kafkaPartitionTypeRoundRobinInput = useInput(
    kafkaOutput?.round_robin?.group_events ? `${kafkaOutput.round_robin.group_events}` : '1',
    kafkaPartitionTypeInput.value === kafkaPartitionType.RoundRobin
      ? validateKafkaPartitioningGroupEvents
      : undefined,
    isDisabled('partition')
  );

  const kafkaTopicsInput = useRadioInput(
    kafkaOutput?.topic && kafkaOutput?.topic?.includes('%{[')
      ? kafkaTopicsType.Dynamic
      : kafkaTopicsType.Static,
    isDisabled('topic')
  );

  const kafkaStaticTopicInput = useInput(
    extractDefaultStaticKafkaTopic(kafkaOutput),
    kafkaTopicsInput.value === kafkaTopicsType.Static ? validateKafkaStaticTopic : undefined,
    isDisabled('topic')
  );

  const kafkaDynamicTopicInput = useComboBoxWithCustomInput(
    'kafkaDynamicTopicComboBox',
    extractDefaultDynamicKafkaTopics(kafkaOutput),
    kafkaTopicsInput.value === kafkaTopicsType.Dynamic ? validateDynamicKafkaTopics : undefined,
    isDisabled('topic')
  );

  const kafkaHeadersInput = useKeyValueInput(
    'kafkaHeadersComboBox',
    kafkaOutput?.headers ?? [{ key: '', value: '' }],
    validateKafkaHeaders,
    isDisabled('headers')
  );

  const kafkaClientIdInput = useInput(
    kafkaOutput?.client_id ?? 'Elastic',
    validateKafkaClientId,
    isDisabled('client_id')
  );

  const kafkaCompressionInput = useSwitchInput(
    !!(kafkaOutput?.compression && kafkaOutput.compression !== kafkaCompressionType.None),
    isDisabled('compression')
  );
  const kafkaCompressionLevelInput = useInput(
    `${kafkaOutput?.compression_level ?? 4}`,
    undefined,
    isDisabled('compression_level')
  );
  const kafkaCompressionCodecInput = useInput(
    kafkaOutput?.compression && kafkaOutput.compression !== kafkaCompressionType.None
      ? kafkaOutput.compression
      : kafkaCompressionType.Gzip,
    undefined,
    isDisabled('compression')
  );

  const kafkaBrokerTimeoutInput = useInput(
    `${kafkaOutput?.timeout ?? 30}`,
    undefined,
    isDisabled('broker_timeout')
  );

  const kafkaBrokerReachabilityTimeoutInput = useInput(
    `${kafkaOutput?.broker_timeout ?? 30}`,
    undefined,
    isDisabled('timeout')
  );

  const kafkaBrokerAckReliabilityInput = useInput(
    `${kafkaOutput?.required_acks ?? kafkaAcknowledgeReliabilityLevel.Commit}`,
    undefined,
    isDisabled('required_acks')
  );

  const kafkaKeyInput = useInput(kafkaOutput?.key, undefined, isDisabled('key'));

  const isLogstash = typeInput.value === outputType.Logstash;
  const isKafka = typeInput.value === outputType.Kafka;
  const isRemoteElasticsearch = typeInput.value === outputType.RemoteElasticsearch;

  const inputs: OutputFormInputsType = {
    nameInput,
    typeInput,
    elasticsearchUrlInput,
    diskQueueEnabledInput,
    diskQueuePathInput,
    diskQueueEncryptionEnabled,
    diskQueueMaxSizeInput,
    diskQueueCompressionEnabled,
    compressionLevelInput,
    logstashHostsInput,
    presetInput,
    additionalYamlConfigInput,
    defaultOutputInput,
    defaultMonitoringOutputInput,
    caTrustedFingerprintInput,
    serviceTokenInput,
    serviceTokenSecretInput,
    kibanaAPIKeyInput,
    kibanaAPIKeySecretInput,
    syncIntegrationsInput,
    kibanaURLInput,
    sslCertificateInput,
    sslKeyInput,
    sslKeySecretInput,
    sslCertificateAuthoritiesInput,
    proxyIdInput,
    loadBalanceEnabledInput,
    memQueueEvents,
    queueFlushTimeout,
    maxBatchBytes,
    kafkaVersionInput,
    kafkaHostsInput,
    kafkaVerificationModeInput,
    kafkaAuthMethodInput,
    kafkaConnectionTypeInput,
    kafkaAuthUsernameInput,
    kafkaAuthPasswordInput,
    kafkaAuthPasswordSecretInput,
    kafkaSaslMechanismInput,
    kafkaPartitionTypeInput,
    kafkaPartitionTypeRandomInput,
    kafkaPartitionTypeHashInput,
    kafkaPartitionTypeRoundRobinInput,
    kafkaHeadersInput,
    kafkaClientIdInput,
    kafkaCompressionInput,
    kafkaCompressionLevelInput,
    kafkaCompressionCodecInput,
    kafkaBrokerTimeoutInput,
    kafkaBrokerReachabilityTimeoutInput,
    kafkaBrokerAckReliabilityInput,
    kafkaKeyInput,
    kafkaSslCertificateAuthoritiesInput,
    kafkaSslCertificateInput,
    kafkaSslKeyInput,
    kafkaSslKeySecretInput,
    kafkaTopicsInput,
    kafkaStaticTopicInput,
    kafkaDynamicTopicInput,
  };

  const hasChanged = Object.values(inputs).some((input) => input.hasChanged);

  const validate = useCallback(() => {
    const nameInputValid = nameInput.validate();
    const elasticsearchUrlsValid = elasticsearchUrlInput.validate();
    const kafkaHostsValid = kafkaHostsInput.validate();
    const kafkaUsernameValid = kafkaAuthUsernameInput.validate();
    const kafkaPasswordPlainValid = kafkaAuthPasswordInput.validate();
    const kafkaPasswordSecretValid = kafkaAuthPasswordSecretInput.validate();
    const kafkaClientIDValid = kafkaClientIdInput.validate();
    const kafkaSslCertificateValid = kafkaSslCertificateInput.validate();
    const kafkaSslKeyPlainValid = kafkaSslKeyInput.validate();
    const kafkaSslKeySecretValid = kafkaSslKeySecretInput.validate();
    const kafkaHeadersValid = kafkaHeadersInput.validate();
    const logstashHostsValid = logstashHostsInput.validate();
    const additionalYamlConfigValid = additionalYamlConfigInput.validate();
    const caTrustedFingerprintValid = caTrustedFingerprintInput.validate();
    const serviceTokenValid = serviceTokenInput.validate();
    const serviceTokenSecretValid = serviceTokenSecretInput.validate();
    const kibanaAPIKeyValid = kibanaAPIKeyInput.validate();
    const kibanaAPIKeySecretValid = kibanaAPIKeySecretInput.validate();
    const kibanaURLInputValid = kibanaURLInput.validate();
    const sslCertificateValid = sslCertificateInput.validate();
    const sslKeyValid = sslKeyInput.validate();
    const sslKeySecretValid = sslKeySecretInput.validate();
    const diskQueuePathValid = diskQueuePathInput.validate();
    const partitioningRandomGroupEventsValid = kafkaPartitionTypeRandomInput.validate();
    const partitioningRoundRobinGroupEventsValid = kafkaPartitionTypeRoundRobinInput.validate();
    const kafkaStaticTopicInputValid = kafkaStaticTopicInput.validate();
    const kafkaStaticDynamicTopicInputValid = kafkaDynamicTopicInput.validate();

    const kafkaSslKeyValid = kafkaSslKeyInput.value
      ? kafkaSslKeyPlainValid
      : kafkaSslKeySecretValid;

    const kafkaPasswordValid = kafkaAuthPasswordInput.value
      ? kafkaPasswordPlainValid
      : kafkaPasswordSecretValid;

    if (isLogstash) {
      // validate logstash
      return (
        logstashHostsValid &&
        additionalYamlConfigValid &&
        nameInputValid &&
        sslCertificateValid &&
        ((sslKeyInput.value && sslKeyValid) || (sslKeySecretInput.value && sslKeySecretValid))
      );
    }
    if (isKafka) {
      // validate kafka
      return (
        nameInputValid &&
        kafkaHostsValid &&
        kafkaSslCertificateValid &&
        kafkaSslKeyValid &&
        kafkaUsernameValid &&
        kafkaPasswordValid &&
        kafkaHeadersValid &&
        additionalYamlConfigValid &&
        kafkaClientIDValid &&
        partitioningRandomGroupEventsValid &&
        partitioningRoundRobinGroupEventsValid &&
        kafkaStaticTopicInputValid &&
        kafkaStaticDynamicTopicInputValid
      );
    }
    if (isRemoteElasticsearch) {
      return (
        elasticsearchUrlsValid &&
        additionalYamlConfigValid &&
        nameInputValid &&
        ((serviceTokenInput.value && serviceTokenValid) ||
          (serviceTokenSecretInput.value && serviceTokenSecretValid)) &&
        ((!syncIntegrationsInput.value && kibanaURLInputValid) ||
          (syncIntegrationsInput.value &&
            ((kibanaAPIKeyInput.value && kibanaAPIKeyValid) ||
              (kibanaAPIKeySecretInput.value && kibanaAPIKeySecretValid)) &&
            kibanaURLInputValid))
      );
    } else {
      // validate ES
      return (
        elasticsearchUrlsValid &&
        additionalYamlConfigValid &&
        nameInputValid &&
        caTrustedFingerprintValid &&
        diskQueuePathValid
      );
    }
  }, [
    nameInput,
    elasticsearchUrlInput,
    kafkaHostsInput,
    kafkaAuthUsernameInput,
    kafkaAuthPasswordInput,
    kafkaAuthPasswordSecretInput,
    kafkaClientIdInput,
    kafkaSslCertificateInput,
    kafkaSslKeyInput,
    kafkaSslKeySecretInput,
    kafkaHeadersInput,
    logstashHostsInput,
    additionalYamlConfigInput,
    caTrustedFingerprintInput,
    serviceTokenInput,
    serviceTokenSecretInput,
    kibanaAPIKeyInput,
    kibanaAPIKeySecretInput,
    syncIntegrationsInput,
    kibanaURLInput,
    sslCertificateInput,
    sslKeyInput,
    sslKeySecretInput,
    diskQueuePathInput,
    kafkaPartitionTypeRandomInput,
    kafkaPartitionTypeRoundRobinInput,
    kafkaStaticTopicInput,
    kafkaDynamicTopicInput,
    isLogstash,
    isKafka,
    isRemoteElasticsearch,
  ]);

  const submit = useCallback(async () => {
    try {
      if (!validate()) {
        return;
      }
      setIsloading(true);

      let shipperParams = {};

      if (!isShipperDisabled) {
        shipperParams = {
          shipper: {
            mem_queue_events: memQueueEvents.value ? Number(memQueueEvents.value) : null,
            queue_flush_timeout: queueFlushTimeout.value ? Number(queueFlushTimeout.value) : null,
            max_batch_bytes: maxBatchBytes.value ? Number(maxBatchBytes.value) : null,
          },
        };
      }

      if (!isShipperDisabled && showExperimentalShipperOptions) {
        shipperParams = {
          ...shipperParams,
          shipper: {
            disk_queue_enabled: diskQueueEnabledInput.value,
            disk_queue_path:
              diskQueueEnabledInput.value && diskQueuePathInput.value
                ? diskQueuePathInput.value
                : '',
            disk_queue_max_size:
              diskQueueEnabledInput.value && diskQueueMaxSizeInput.value
                ? diskQueueMaxSizeInput.value
                : null,
            disk_queue_encryption_enabled:
              diskQueueEnabledInput.value && diskQueueEncryptionEnabled.value,
            disk_queue_compression_enabled: diskQueueCompressionEnabled.value,
            compression_level: diskQueueCompressionEnabled.value
              ? Number(compressionLevelInput.value)
              : null,
            loadbalance: loadBalanceEnabledInput.value,
          },
        };
      }

      const proxyIdValue = proxyIdInput.value !== '' ? proxyIdInput.value : null;

      const payload: NewOutput = (() => {
        const parseIntegerIfStringDefined = (value: string | undefined): number | undefined => {
          if (value !== undefined) {
            const parsedInt = parseInt(value, 10);
            if (!isNaN(parsedInt)) {
              return parsedInt;
            }
          }
          return undefined;
        };

        switch (typeInput.value) {
          case outputType.Kafka:
            const definedCA = kafkaSslCertificateAuthoritiesInput.value.filter(
              (val) => val !== ''
            ).length;

            const maybeSecrets = extractKafkaOutputSecrets({
              kafkaSslKeyInput,
              kafkaSslKeySecretInput,
              kafkaAuthPasswordInput,
              kafkaAuthPasswordSecretInput,
            });

            return {
              name: nameInput.value,
              type: outputType.Kafka,
              hosts: kafkaHostsInput.value,
              is_default: defaultOutputInput.value,
              is_default_monitoring: defaultMonitoringOutputInput.value,
              config_yaml: additionalYamlConfigInput.value,
              ...(kafkaConnectionTypeInput.value !== kafkaConnectionType.Plaintext ||
              kafkaAuthMethodInput.value !== kafkaAuthType.None
                ? {
                    ssl: {
                      ...(definedCA
                        ? {
                            certificate_authorities:
                              kafkaSslCertificateAuthoritiesInput.value.filter((val) => val !== ''),
                          }
                        : {}),
                      ...(kafkaAuthMethodInput.value === kafkaAuthType.Ssl
                        ? {
                            certificate: kafkaSslCertificateInput.value,
                            key: kafkaSslKeyInput.value,
                          }
                        : {}),
                      verification_mode: kafkaVerificationModeInput.value,
                    },
                  }
                : {}),
              proxy_id: proxyIdValue,

              client_id: kafkaClientIdInput.value || undefined,
              version: kafkaVersionInput.value,
              ...(kafkaKeyInput.value ? { key: kafkaKeyInput.value } : {}),
              compression: kafkaCompressionInput.value
                ? kafkaCompressionCodecInput.value
                : kafkaCompressionType.None,
              ...(kafkaCompressionInput.value &&
              kafkaCompressionCodecInput.value === kafkaCompressionType.Gzip
                ? {
                    compression_level: parseIntegerIfStringDefined(
                      kafkaCompressionLevelInput.value
                    ),
                  }
                : {}),

              auth_type: kafkaAuthMethodInput.value,
              ...(kafkaAuthMethodInput.value === kafkaAuthType.None
                ? { connection_type: kafkaConnectionTypeInput.value }
                : {}),
              ...(kafkaAuthMethodInput.value === kafkaAuthType.Userpass &&
              kafkaAuthUsernameInput.value
                ? { username: kafkaAuthUsernameInput.value }
                : {}),
              ...(kafkaAuthMethodInput.value === kafkaAuthType.Userpass &&
              kafkaAuthPasswordInput.value
                ? { password: kafkaAuthPasswordInput.value }
                : {}),
              ...(kafkaAuthMethodInput.value === kafkaAuthType.Userpass &&
              kafkaSaslMechanismInput.value
                ? { sasl: { mechanism: kafkaSaslMechanismInput.value } }
                : {}),

              partition: kafkaPartitionTypeInput.value,
              ...(kafkaPartitionTypeInput.value === kafkaPartitionType.Random &&
              kafkaPartitionTypeRandomInput.value
                ? {
                    random: {
                      group_events: parseIntegerIfStringDefined(
                        kafkaPartitionTypeRandomInput.value
                      ),
                    },
                  }
                : {}),
              ...(kafkaPartitionTypeInput.value === kafkaPartitionType.RoundRobin &&
              kafkaPartitionTypeRoundRobinInput.value
                ? {
                    round_robin: {
                      group_events: parseIntegerIfStringDefined(
                        kafkaPartitionTypeRoundRobinInput.value
                      ),
                    },
                  }
                : {}),
              ...(kafkaPartitionTypeInput.value === kafkaPartitionType.Hash &&
              kafkaPartitionTypeHashInput.value
                ? {
                    hash: {
                      hash: kafkaPartitionTypeHashInput.value,
                    },
                  }
                : {}),
              ...(kafkaTopicsInput.value === kafkaTopicsType.Static && kafkaStaticTopicInput.value
                ? {
                    topic: kafkaStaticTopicInput.value,
                  }
                : kafkaTopicsInput.value === kafkaTopicsType.Dynamic && kafkaDynamicTopicInput.value
                ? {
                    topic: `%{[${kafkaDynamicTopicInput.value}]}`,
                  }
                : {}),
              headers: kafkaHeadersInput.value,
              timeout: parseIntegerIfStringDefined(kafkaBrokerTimeoutInput.value),
              broker_timeout: parseIntegerIfStringDefined(
                kafkaBrokerReachabilityTimeoutInput.value
              ),
              required_acks: parseIntegerIfStringDefined(kafkaBrokerAckReliabilityInput.value),
              ...shipperParams,
              ...(maybeSecrets ? { secrets: maybeSecrets } : {}),
            } as KafkaOutput;
          case outputType.Logstash:
            return {
              name: nameInput.value,
              type: outputType.Logstash,
              hosts: logstashHostsInput.value,
              is_default: defaultOutputInput.value,
              is_default_monitoring: defaultMonitoringOutputInput.value,
              config_yaml: additionalYamlConfigInput.value,
              ssl: {
                certificate: sslCertificateInput.value,
                key: sslKeyInput.value || undefined,
                certificate_authorities: sslCertificateAuthoritiesInput.value.filter(
                  (val) => val !== ''
                ),
              },
              ...(!sslKeyInput.value &&
                sslKeySecretInput.value && {
                  secrets: {
                    ssl: {
                      key: sslKeySecretInput.value,
                    },
                  },
                }),
              proxy_id: proxyIdValue,
              ...shipperParams,
            } as NewLogstashOutput;
          case outputType.RemoteElasticsearch:
            let secrets;
            if (!serviceTokenInput.value && serviceTokenSecretInput.value) {
              secrets = {
                service_token: serviceTokenSecretInput.value,
              };
            }
            if (!kibanaAPIKeyInput.value && kibanaAPIKeySecretInput.value) {
              secrets = {
                ...(secrets ?? {}),
                kibana_api_key: kibanaAPIKeySecretInput.value,
              };
            }
            return {
              name: nameInput.value,
              type: outputType.RemoteElasticsearch,
              hosts: elasticsearchUrlInput.value,
              is_default: defaultOutputInput.value,
              is_default_monitoring: defaultMonitoringOutputInput.value,
              preset: presetInput.value,
              config_yaml: additionalYamlConfigInput.value,
              service_token: serviceTokenInput.value || undefined,
              kibana_api_key: kibanaAPIKeyInput.value || undefined,
              ...(secrets ? { secrets } : {}),
              sync_integrations: syncIntegrationsInput.value,
              kibana_url: kibanaURLInput.value || null,
              proxy_id: proxyIdValue,
              ...shipperParams,
            } as NewRemoteElasticsearchOutput;
          case outputType.Elasticsearch:
          default:
            return {
              name: nameInput.value,
              type: outputType.Elasticsearch,
              hosts: elasticsearchUrlInput.value,
              is_default: defaultOutputInput.value,
              is_default_monitoring: defaultMonitoringOutputInput.value,
              preset: presetInput.value,
              config_yaml: additionalYamlConfigInput.value,
              ca_trusted_fingerprint: caTrustedFingerprintInput.value,
              proxy_id: proxyIdValue,
              ...shipperParams,
            } as NewElasticsearchOutput;
        }
      })();

      if (output) {
        // Update
        if (!(await confirmUpdate(output, confirm))) {
          setIsloading(false);
          return;
        }

        const res = await sendPutOutput(output.id, payload);
        if (res.error) {
          throw res.error;
        }
      } else {
        // Create
        const res = await sendPostOutput(payload);
        if (res.error) {
          throw res.error;
        }
      }

      onSucess();
      setIsloading(false);
    } catch (err) {
      setIsloading(false);
      notifications.toasts.addError(err, {
        title: i18n.translate('xpack.fleet.settings.outputForm.errorToastTitle', {
          defaultMessage: 'Error while saving output',
        }),
      });
    }
  }, [
    validate,
    isShipperDisabled,
    showExperimentalShipperOptions,
    proxyIdInput.value,
    output,
    onSucess,
    memQueueEvents.value,
    queueFlushTimeout.value,
    maxBatchBytes.value,
    diskQueueEnabledInput.value,
    diskQueuePathInput.value,
    diskQueueMaxSizeInput.value,
    diskQueueEncryptionEnabled.value,
    diskQueueCompressionEnabled.value,
    compressionLevelInput.value,
    loadBalanceEnabledInput.value,
    typeInput.value,
    kafkaSslCertificateAuthoritiesInput.value,
    kafkaSslKeyInput,
    kafkaSslKeySecretInput,
    kafkaAuthPasswordInput,
    kafkaAuthPasswordSecretInput,
    nameInput.value,
    kafkaHostsInput.value,
    defaultOutputInput.value,
    defaultMonitoringOutputInput.value,
    additionalYamlConfigInput.value,
    kafkaConnectionTypeInput.value,
    kafkaAuthMethodInput.value,
    kafkaSslCertificateInput.value,
    kafkaVerificationModeInput.value,
    kafkaClientIdInput.value,
    kafkaVersionInput.value,
    kafkaKeyInput.value,
    kafkaCompressionInput.value,
    kafkaCompressionCodecInput.value,
    kafkaCompressionLevelInput.value,
    kafkaAuthUsernameInput.value,
    kafkaSaslMechanismInput.value,
    kafkaPartitionTypeInput.value,
    kafkaPartitionTypeRandomInput.value,
    kafkaPartitionTypeRoundRobinInput.value,
    kafkaPartitionTypeHashInput.value,
    kafkaTopicsInput.value,
    kafkaStaticTopicInput.value,
    kafkaDynamicTopicInput.value,
    kafkaHeadersInput.value,
    kafkaBrokerTimeoutInput.value,
    kafkaBrokerReachabilityTimeoutInput.value,
    kafkaBrokerAckReliabilityInput.value,
    logstashHostsInput.value,
    sslCertificateInput.value,
    sslKeyInput.value,
    sslCertificateAuthoritiesInput.value,
    sslKeySecretInput.value,
    elasticsearchUrlInput.value,
    presetInput.value,
    serviceTokenInput.value,
    serviceTokenSecretInput.value,
    kibanaAPIKeyInput.value,
    kibanaAPIKeySecretInput.value,
    syncIntegrationsInput.value,
    kibanaURLInput.value,
    caTrustedFingerprintInput.value,
    confirm,
    notifications.toasts,
  ]);

  return {
    inputs,
    submit,
    isLoading,
    hasEncryptedSavedObjectConfigured,
    isShipperEnabled: !isShipperDisabled,
    isDisabled:
      isLoading || (output && !hasChanged) || (isLogstash && !hasEncryptedSavedObjectConfigured),
  };
}
