# Cloud Connect Plugin

This plugin allows self-managed users to connect their cluster to an Elastic Cloud account, enabling cloud-managed services and features for self-managed deployments.

## Overview

The Cloud Connect plugin adds a "Cloud Connect" management page to Kibana, providing a secure bridge between self-managed clusters and Elastic Cloud services. This enables self-managed users to leverage cloud-native features like Auto Ops and Elastic Inference Service (EIS) without migrating to a fully cloud-hosted solution.

## How It Works

### Authentication Flow

1. **Cloud API Key Generation**
   - Users navigate to Elastic Cloud and generate an API key for their organization
   - The initial API key may have broad permissions and should be scoped appropriately
   - API keys should be scoped to only the permissions needed for cluster connection and service management

2. **Onboarding Process**
   - User navigates to the Cloud Connect management page in Kibana
   - If not already connected, the onboarding wizard guides them through the connection process
   - User enters the API key from Elastic Cloud
   - The plugin validates the API key by authenticating with the Cloud API

3. **Secure Storage**
   - Once validated, the API key and cluster metadata are stored in Kibana's encrypted saved objects
   - **Requirement**: `xpack.encryptedSavedObjects.encryptionKey` must be configured in `kibana.yml`
   - This ensures that sensitive credentials are encrypted
   - The saved object includes:
     - Cloud API key (encrypted)
     - Cloud cluster ID

4. **Cloud API Communication**
   - The plugin uses the stored API key to authenticate all requests to the Cloud API
   - Manages cluster connection status and service configurations
   - Handles enabling/disabling cloud services (Auto Ops, EIS inference)
   - Automatically rolls back changes if service configuration fails

### Service Management

The plugin supports managing the following cloud services:

- **Auto Ops**: Automated cluster operations and monitoring
- **Elastic Inference Service (EIS)**: Cloud-hosted inference capabilities
  - When enabling EIS, the plugin receives an inference API key from Cloud
  - This key is automatically configured in Elasticsearch's inference settings
  - If Elasticsearch configuration fails, the plugin rolls back the Cloud API changes

## Configuration

### Required Settings

```yaml
# kibana.yml
xpack.encryptedSavedObjects.encryptionKey: "your-32-character-encryption-key-here"
```

NOTE: in dev we have an encryptionKey set by default but in production you must set one.

### Optional Settings

The plugin uses the production cloud API endpoint by default. But for development its recommended to point to QA instead:

```yaml
# kibana.yml
xpack.cloud_connect.cloudUrl: 'https://console.qa.cld.elstc.co'
```

### Permissions

Users need the following Kibana privilege to use this plugin:

- `cloudConnect.configure`: Allows connecting/disconnecting clusters and managing services