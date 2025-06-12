#!/usr/bin/env bash

# This script is used to run a instance of Elastic Agent in a Docker container.
# Ref.: https://www.elastic.co/guide/en/fleet/current/elastic-agent-container.html

# To run a Fleet server: ./run_elastic_agent.sh fleet_server
# To run an agent: ./run agent -e <enrollment token> -v <version> -t <tags>
# NB: this script assumes a Fleet server policy with id "fleet-server-policy" is already created.

CMD=$1

while [ $# -gt 0 ]; do
  case $1 in
    -e | --enrollment-token) ENROLLMENT_TOKEN=$2 ;;
    -v | --version) ELASTIC_AGENT_VERSION=$2 ;;
    -t | --tags) TAGS=$2 ;;
  esac
  shift
done

DEFAULT_ELASTIC_AGENT_VERSION=8.15.0-SNAPSHOT # update as needed
ELASTICSEARCH_HOST=http://host.docker.internal:9200
KIBANA_HOST=http://host.docker.internal:5601
KIBANA_BASE_PATH=your-base-path
FLEET_SERVER_URL=https://host.docker.internal:8220
FLEET_SERVER_POLICY_ID=fleet-server-policy

printArgs() {
  if [[ $ELASTIC_AGENT_VERSION == "" ]]; then
    ELASTIC_AGENT_VERSION=$DEFAULT_ELASTIC_AGENT_VERSION
    echo "No Elastic Agent version specified, setting to $ELASTIC_AGENT_VERSION (default)"
  else
    echo "Received Elastic Agent version $ELASTIC_AGENT_VERSION"
  fi

  if [[ $ENROLLMENT_TOKEN == "" ]]; then
    echo "Warning: no enrollment token provided!"
  else
    echo "Received enrollment token: ${ENROLLMENT_TOKEN}"
  fi

  if [[ $TAGS != "" ]]; then
    echo "Received tags: ${TAGS}"
  fi
}

echo "--- Elastic Agent Container Runner ---"

if [[ $CMD == "fleet_server" ]]; then
  echo "Starting Fleet Server container..."

  printArgs

  docker run \
    -e ELASTICSEARCH_HOST=${ELASTICSEARCH_HOST} \
    -e KIBANA_HOST=${KIBANA_HOST}/${KIBANA_BASE_PATH} \
    -e KIBANA_USERNAME=elastic \
    -e KIBANA_PASSWORD=changeme \
    -e KIBANA_FLEET_SETUP=1 \
    -e FLEET_INSECURE=1 \
    -e FLEET_SERVER_ENABLE=1 \
    -e FLEET_SERVER_POLICY_ID=${FLEET_SERVER_POLICY_ID} \
    -e ELASTIC_AGENT_TAGS=${TAGS} \
    -p 8220:8220 \
    --rm docker.elastic.co/elastic-agent/elastic-agent:${ELASTIC_AGENT_VERSION}

elif [[ $CMD == "agent" ]]; then
  echo "Starting Elastic Agent container..."

  printArgs

  docker run \
    -e FLEET_URL=${FLEET_SERVER_URL} \
    -e FLEET_ENROLL=1 \
    -e FLEET_ENROLLMENT_TOKEN=${ENROLLMENT_TOKEN} \
    -e FLEET_INSECURE=1 \
    -e ELASTIC_AGENT_TAGS=${TAGS} \
    --rm docker.elastic.co/elastic-agent/elastic-agent:${ELASTIC_AGENT_VERSION}

elif [[ $CMD == "help" ]]; then
  echo "Usage: ./run_elastic_agent.sh <agent/fleet_server> -e <enrollment token> -v <version> -t <tags>"

elif [[ $CMD == "" ]]; then
  echo "Command missing. Available commands: agent, fleet_server, help"

else
  echo "Invalid command: $CMD"
fi
