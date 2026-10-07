# @kbn/ai-anonymization-common

Types and constants for AI anonymization rules (`AnonymizationRule`, `AnonymizationSettings`,
`NER_MODEL_ID`, ...). Safe to import from both browser and server code, so it must not import
Node-only modules or `@kbn/config-schema`.

Owned by `@elastic/security-investigations`. The server-side implementation is
`@kbn/ai-anonymization-server`.
