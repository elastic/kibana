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

killall node &> /dev/null # TODO: REMOVE!!
sleep 2

# Ensure Kibana port is available
if lsof -Pi :$KIBANA_PORT -sTCP:LISTEN -t >/dev/null ; then
    printf "⚠️  Cannot start Kibana because another process is already running on port ${KIBANA_PORT}:\n\n"
    lsof -Pi :$KIBANA_PORT -sTCP:LISTEN
    exit 1
fi

# ensure that background tasks (kibana) are killed when the script ends
# trap "exit" INT TERM ERR
# trap "kill 0" EXIT


# Create tmp folder
mkdir -p tmp

# Start Kibana in background
printf "\n===Kibana===\n"
echo "Starting (logs: tmp/kibana.logs)"
(cd ../../../../../ && \
node ./scripts/kibana \
    --no-base-path \
    --optimize.watch=false \
    --server.port=${KIBANA_PORT} \
    --config x-pack/legacy/plugins/apm/e2e/ci/kibana.e2e.yml
) &> ./tmp/kibana.log &

KIBANA_BG_PID=$!

# Clone or pull apm-integration-testing
printf "\n===apm-integration-testing===\n"
echo "Cloning"
git clone "https://github.com/elastic/apm-integration-testing.git" "./tmp/apm-integration-testing" &> /dev/null
if [ $? -eq 0 ]; then
    echo "Pulling..."
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


printf "\n===Static mock data===\n"

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
echo "Waiting for Kibana to start... (Running as: ${KIBANA_BG_PID})"
yarn wait-on -i 500 -w 500 http://localhost:$KIBANA_PORT > /dev/null

echo "✅ Setup completed successfully. Running tests..."

# run cypress tests
yarn cypress open --config pageLoadTimeout=100000,watchForFileChanges=true

