#!/usr/bin/env bash

set -e

# install Java
# oracle-java8: https://github.com/dockerfile/java/blob/926218ef9b5b6c83bb07aae9a0aaa2ba118f6372/oracle-java8/Dockerfile
# oracle-java7: https://github.com/dockerfile/java/tree/926218ef9b5b6c83bb07aae9a0aaa2ba118f6372/oracle-java7/Dockerfile

case $JAVA_VERSION in

  8)
    echo oracle-java8-installer shared/accepted-oracle-license-v1-1 select true | debconf-set-selections
    add-apt-repository -y ppa:webupd8team/java
    apt-get update -y
    apt-get install -y oracle-java8-installer
    rm -rf /var/lib/apt/lists/*
    rm -rf /var/cache/oracle-jdk8-installer

    ln -s /JAVA_HOME /usr/lib/jvm/java-8-oracle
    ;;

  7)
    echo oracle-java7-installer shared/accepted-oracle-license-v1-1 select true | debconf-set-selections
    add-apt-repository -y ppa:webupd8team/java
    apt-get update -y
    apt-get install -y oracle-java7-installer
    rm -rf /var/lib/apt/lists/*
    rm -rf /var/cache/oracle-jdk7-installer

    ln -s /JAVA_HOME /usr/lib/jvm/java-7-oracle
    ;;

  *)
    echo "invalid JAVA_VERSION \"$JAVA_VERSION\", pass either 8 (default) or 7"
    exit 1;
    ;;

esac
