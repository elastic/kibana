# @kbn/ai-anonymization-common

Types and constants for AI anonymization rules (`AnonymizationRule`, `AnonymizationSettings`,
`NER_MODEL_ID`, ...). Safe to import from both browser and server code, so it must not import
Node-only modules or `@kbn/config-schema`.

Not to be confused with `@kbn/anonymization-common`, which belongs to a disabled platform service
that is awaiting removal.

Owned by `@elastic/security-investigations`. The server-side implementation is
`@kbn/ai-anonymization-server`.
