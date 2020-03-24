# variables
KIBANA_PORT=5701
ELASTICSEARCH_PORT=9201
APM_SERVER_PORT=8201

# ensure Docker is running
docker ps &> /dev/null
if [ $? -ne 0 ]; then
    echo "⚠️  Please start Docker"
    exit 1
fi

# formatting
bold=$(tput bold)
normal=$(tput sgr0)

# Create tmp folder
mkdir -p tmp

# Ask user to start Kibana
echo "
${bold}To start Kibana please run the following command:${normal}

node ./scripts/kibana --no-base-path --dev --no-dev-config --config x-pack/legacy/plugins/apm/e2e/ci/kibana.e2e.yml
"

# Clone or pull apm-integration-testing
printf "\n${bold}=== apm-integration-testing ===\n${normal}"

git clone "https://github.com/elastic/apm-integration-testing.git" "./tmp/apm-integration-testing" &> /dev/null
if [ $? -eq 0 ]; then
    echo "Cloning repository"
else
    echo "Pulling from master..."
    git -C "./tmp/apm-integration-testing" pull &> /dev/null
fi

# Start apm-integration-testing
echo "Starting (logs: ./tmp/apm-it.log)"
./tmp/apm-integration-testing/scripts/compose.py start master \
    --no-kibana \
    --elasticsearch-port $ELASTICSEARCH_PORT \
    --apm-server-port=$APM_SERVER_PORT \
    --elasticsearch-heap 4g \
    &> ./tmp/apm-it.log

# Stop if apm-integration-testing failed to start correctly
if [ $? -ne 0 ]; then
    printf "⚠️  apm-integration-testing could not be started.\n"
    printf "Please see the logs in ./tmp/apm-it.log\n\n"
    printf "As a last resort, reset docker with:\n\n./tmp/apm-integration-testing/scripts/compose.py stop && system prune --all --force --volumes\n"
    exit 1
fi

printf "\n${bold}=== Static mock data ===\n${normal}"

# Download static data if not already done
if [ -e "./tmp/events.json" ]; then
    echo 'Skip: events.json already exists. Not downloading'
else
    echo 'Downloading events.json...'
    curl --silent https://storage.googleapis.com/apm-ui-e2e-static-data/events.json --output ./tmp/events.json
fi

# echo "Deleting existing indices (apm* and .apm*)"
curl --silent --user admin:changeme -XDELETE "localhost:${ELASTICSEARCH_PORT}/.apm*" > /dev/null
curl --silent --user admin:changeme -XDELETE "localhost:${ELASTICSEARCH_PORT}/apm*" > /dev/null

# Ingest data into APM Server
echo "Ingesting data (logs: tmp/ingest-data.log)"
node ingest-data/replay.js --server-url http://localhost:$APM_SERVER_PORT --events ./tmp/events.json  2> ./tmp/ingest-data.log

# Install local dependencies
printf "\n"
echo "Installing local dependencies (logs: tmp/e2e-yarn.log)"
yarn &> ./tmp/e2e-yarn.log

# Wait for Kibana to start
echo "Waiting for Kibana to start..."
yarn wait-on -i 500 -w 500 http://localhost:$KIBANA_PORT > /dev/null

echo "\n✅ Setup completed successfully. Running tests...\n"

# run cypress tests
yarn cypress run --config pageLoadTimeout=100000,watchForFileChanges=true

echo "

${bold}If you want to run the test interactively, run:${normal}

yarn cypress open --config pageLoadTimeout=100000,watchForFileChanges=true
"

