#/bin/bash

PW=$(openssl rand -base64 16;)
ELASTIC_PASSWORD="${ELASTIC_PASSWORD:-$PW}"
export ELASTIC_PASSWORD
echo "Running 'setup-elasticsearch.sh'\n"
docker-compose run --rm -e ELASTIC_PASSWORD=$ELASTIC_PASSWORD elasticsearch /usr/local/bin/setup-elasticsearch.sh
echo "Starting Elasticsearch...."

docker-compose up -d elasticsearch
printf "Running 'setup-users.sh'\n"
docker exec -i -e ELASTIC_PASSWORD=$ELASTIC_PASSWORD elasticsearch /usr/local/bin/setup-users.sh

## setup kibana
printf "Running 'setup-kibana.sh'\n"
docker-compose run --rm -e ELASTIC_PASSWORD=$ELASTIC_PASSWORD kibana /usr/local/bin/setup-kibana.sh
docker-compose up -d kibana
## setup logstash
printf "Running 'setup-logstash.sh'\n"
docker-compose run --rm -u root -e ELASTIC_PASSWORD=$ELASTIC_PASSWORD logstash /usr/local/bin/setup-logstash.sh

## setup filebeat
for service in auditbeat filebeat heartbeat packetbeat metricbeat apm-server
do
  setup_command="docker-compose run --rm -u root -e ELASTIC_PASSWORD=$ELASTIC_PASSWORD $service /usr/local/bin/setup-beat.sh"
  eval $setup_command
done

printf "\n\n****************************\n\n"
printf "Setup completed successfully. To start the stack please run:\n\t docker-compose up -d\n"
printf "\nYour 'elastic' user password is: $ELASTIC_PASSWORD\n"
