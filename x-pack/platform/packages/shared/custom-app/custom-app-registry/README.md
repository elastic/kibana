# @kbn/custom-app-registry

The registry of capabilities for custom apps. A capability is one entry in it: a manifest that says
what it is, what settings it takes and how to describe it, from which the schema of a node, its type,
its checks and the text that tells an LLM about it are made.

It knows nothing about any particular capability. Other packages and plugins register theirs with
`registerCapability`, and add the type of their node to `NodeTypeMap`.
