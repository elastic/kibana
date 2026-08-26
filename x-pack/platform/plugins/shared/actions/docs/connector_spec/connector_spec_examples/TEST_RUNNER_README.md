# Connector Test Runner

Simple Node.js script to test threat intelligence connectors with real API calls.

## Prerequisites

```bash
# Navigate to the examples directory
cd connector_spec/connector_spec_examples

# Install dependencies
npm install -g tsx  # TypeScript runner
# OR use the main Kibana node_modules (recommended)
```

## Usage

Since the connectors use `@kbn/zod`, you need to run from the Kibana root directory:

```bash
cd /path/to/kibana
npx tsx connector_spec/connector_spec_examples/test_connector.ts <connector> <header=value> <action> <input-json>
```

### Parameters

- `connector`: Connector name (virustotal, abuseipdb, greynoise, shodan, alienvault, urlvoid)
- `header=value`: Authentication header (format: `HeaderName=ApiKey`)
- `action`: Action name to execute
- `input-json`: JSON string with action inputs

## Examples

### VirusTotal

```bash
# Scan file hash
npx tsx connector_spec/connector_spec_examples/test_connector.ts virustotal x-apikey=YOUR_KEY scanFileHash '{"hash":"44d88612fea8a8f36de82e1278abb02f"}'

# Get IP report
npx tsx connector_spec/connector_spec_examples/test_connector.ts virustotal x-apikey=YOUR_KEY getIpReport '{"ip":"8.8.8.8"}'

# Scan URL
npx tsx connector_spec/connector_spec_examples/test_connector.ts virustotal x-apikey=YOUR_KEY scanUrl '{"url":"https://example.com"}'
```

### AbuseIPDB

```bash
# Check IP reputation
npx tsx connector_spec/connector_spec_examples/test_connector.ts abuseipdb Key=YOUR_KEY checkIp '{"ipAddress":"8.8.8.8","maxAgeInDays":90}'

# Get IP info
npx tsx connector_spec/connector_spec_examples/test_connector.ts abuseipdb Key=YOUR_KEY getIpInfo '{"ipAddress":"8.8.8.8"}'

# Bulk check network
npx tsx connector_spec/connector_spec_examples/test_connector.ts abuseipdb Key=YOUR_KEY bulkCheck '{"network":"8.8.8.0/24"}'
```

### GreyNoise

```bash
# Quick IP lookup
npx tsx connector_spec/connector_spec_examples/test_connector.ts greynoise key=YOUR_KEY quickLookup '{"ip":"8.8.8.8"}'

# Get full IP context
npx tsx connector_spec/connector_spec_examples/test_connector.ts greynoise key=YOUR_KEY getIpContext '{"ip":"8.8.8.8"}'

# RIOT lookup (benign service check)
npx tsx connector_spec/connector_spec_examples/test_connector.ts greynoise key=YOUR_KEY riotLookup '{"ip":"8.8.8.8"}'
```

### Shodan

```bash
# Get host information
npx tsx connector_spec/connector_spec_examples/test_connector.ts shodan X-Api-Key=YOUR_KEY getHostInfo '{"ip":"8.8.8.8"}'

# Search hosts
npx tsx connector_spec/connector_spec_examples/test_connector.ts shodan X-Api-Key=YOUR_KEY searchHosts '{"query":"apache","page":1}'

# Count search results
npx tsx connector_spec/connector_spec_examples/test_connector.ts shodan X-Api-Key=YOUR_KEY countResults '{"query":"port:22"}'

# Get services list
npx tsx connector_spec/connector_spec_examples/test_connector.ts shodan X-Api-Key=YOUR_KEY getServices '{}'
```

### AlienVault OTX

```bash
# Search pulses
npx tsx connector_spec/connector_spec_examples/test_connector.ts alienvault X-OTX-API-KEY=YOUR_KEY searchPulses '{"limit":5}'

# Get indicator info
npx tsx connector_spec/connector_spec_examples/test_connector.ts alienvault X-OTX-API-KEY=YOUR_KEY getIndicator '{"indicatorType":"IPv4","indicator":"8.8.8.8"}'

# Get pulse details
npx tsx connector_spec/connector_spec_examples/test_connector.ts alienvault X-OTX-API-KEY=YOUR_KEY getPulse '{"pulseId":"PULSE_ID_HERE"}'
```

### URLVoid

```bash
# Check API stats
npx tsx connector_spec/connector_spec_examples/test_connector.ts urlvoid X-Api-Key=YOUR_KEY scanDomainStats '{}'

# Scan domain
npx tsx connector_spec/connector_spec_examples/test_connector.ts urlvoid X-Api-Key=YOUR_KEY scanDomain '{"domain":"example.com"}'

# Check URL
npx tsx connector_spec/connector_spec_examples/test_connector.ts urlvoid X-Api-Key=YOUR_KEY checkUrl '{"url":"https://example.com"}'
```

## Output

The script will display:
- ✓ Success message if the action completes
- Formatted JSON response data
- ✗ Error message if the action fails
- HTTP status and error details on failure

## Notes

- Replace `YOUR_KEY` with your actual API key for each service
- Some actions may require paid API plans
- Rate limits apply based on your API plan
- The script uses axios for HTTP requests
- Authentication is passed via headers to match the connector spec


