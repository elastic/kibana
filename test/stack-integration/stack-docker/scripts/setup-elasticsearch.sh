#!/bin/bash
configdir=/usr/share/elasticsearch/config
# Determine if x-pack is enabled
echo "Determining if x-pack is installed..."
if [[ -f bin/elasticsearch-users ]]; then
    if [[ -n "$ELASTIC_PASSWORD" ]]; then

        echo "=== CREATE Keystore ==="
        echo "Elastic password is: $ELASTIC_PASSWORD"
        if [ -f $configdir/elasticsearch.keystore ]; then
            echo "Remove old elasticsearch.keystore"
            rm $configdir/elasticsearch.keystore
        fi
        [[ -f $configdir/elasticsearch.keystore ]] || (/usr/share/elasticsearch/bin/elasticsearch-keystore create)
        echo "Setting bootstrap.password..."
        (echo "$ELASTIC_PASSWORD" | /usr/share/elasticsearch/bin/elasticsearch-keystore add -x 'bootstrap.password')

        # Create SSL Certs
        echo "=== CREATE SSL CERTS ==="

        # check if old docker-cluster-ca.zip exists, if it does remove and create a new one.
        if [ -f $configdir/certs/ssl/docker-cluster-ca.zip ]; then
            echo "Remove old ca zip..."
            rm $configdir/certs/ssl/docker-cluster-ca.zip
        fi
        echo "Creating docker-cluster-ca.zip..."
        /usr/share/elasticsearch/bin/elasticsearch-certutil ca --pem --silent --out $configdir/certs/ssl/docker-cluster-ca.zip

        # check if ca directory exists, if does, remove then unzip new files
        if [ -d $configdir/certs/ssl/ca ]; then
            echo "CA directory exists, removing..."
            rm -rf $configdir/certs/ssl/ca
        fi
        echo "Unzip ca files..."
        echo "elasticsearch took unzip out of image https://github.com/elastic/elasticsearch/commit/c9f08d85ed0c4ce942a4f20f62c3e476a276c153#diff-859c3241425f7d434b99d8f13cb720ae"
        yum install -y unzip
        unzip $configdir/certs/ssl/docker-cluster-ca.zip -d $configdir/certs/ssl

        # check if certs zip exist. If it does remove and create a new one.
        if [ -f $configdir/certs/ssl/docker-cluster.zip ]; then
            echo "Remove old docker-cluster.zip zip..."
            rm $configdir/certs/ssl/docker-cluster.zip
        fi
        echo "Create cluster certs zipfile..."
        /usr/share/elasticsearch/bin/elasticsearch-certutil cert --silent --pem --in $configdir/certs/ssl/instances.yml --out $configdir/certs/ssl/docker-cluster.zip --ca-cert $configdir/certs/ssl/ca/ca.crt --ca-key $configdir/certs/ssl/ca/ca.key

        if [ -d $configdir/certs/ssl/docker-cluster ]; then
            rm -rf $configdir/certs/ssl/docker-cluster
        fi
        echo "Unzipping cluster certs zipfile..."
        unzip $configdir/certs/ssl/docker-cluster.zip -d $configdir/certs/ssl/docker-cluster

        chown 1000:1000 -R $configdir/certs
        echo "setup-elasticsearch.sh.... done"
    fi
fi
