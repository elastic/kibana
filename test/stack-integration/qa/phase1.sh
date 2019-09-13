#!/bin/bash
echo -e "\n-- `date` Starting phase 1"

set -e
set -x
cd /vagrant/qa || cd /c/vagrant/qa
if [ -f phase1.marker ]; then rm phase1.marker; fi
# cd to the qa/ dir where this script lives
# cd "$( dirname "${BASH_SOURCE[0]}" )"
QADIR=$PWD

date
. ./envvars.sh

. ./install_java.sh

#config for kerberos
if [ "${VM}" == "ubuntu16_deb_desktop_krb" ]; then
	cp /vagrant/kerberos/* /etc/
	sudo apt-get update
	sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq krb5-kdc krb5-admin-server krb5-config
	sudo kdb5_util -r TEST.ELASTIC.CO create -s -P changeme
	sudo kadmin.local -q "addprinc -pw changeme tester@TEST.ELASTIC.CO"
	sudo kadmin.local -q "addprinc -randkey host/kerberos.test.elastic.co"
	sudo kadmin.local -q "addprinc -randkey HTTP/kerberos.test.elastic.co"
	sudo kadmin.local -q "addprinc -randkey HTTP/localhost"
	sudo kadmin.local -q "ktadd host/kerberos.test.elastic.co"
	sudo kadmin.local -q "ktadd HTTP/localhost"
	sudo systemctl restart krb5-admin-server.service
	sudo systemctl start krb5-kdc
	sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq krb5-user libpam-krb5 libpam-ccreds auth-client-config
	echo 'changeme' || kinit tester
	sudo chmod a=rwx /etc/krb5.keytab
	sudo chmod a=rwx /etc/krb5.conf
fi


java_version=$(java -version 2>&1 | grep version | sed 's|.* version "\(.*\..*\)\..*_.*"|\1|')
echo -e "\n-- `date` Java version = $java_version"
if [[ $java_version < 1.8 ]]; then
  echo "Failed to find Java 1.8 or later"
  exit 1
fi

if [ "${PLATFORM}" = "-windows-x86_64" ]; then
  echo "rm -rf ${INSTALL_DIR}"
  rm -rf $INSTALL_DIR
  mkdir -p $INSTALL_DIR
  echo "${BASEURL} ${VERSION}" > ${INSTALL_DIR}/README-${VERSION}.txt
  env >> ${INSTALL_DIR}/README-${VERSION}.txt
  # trap 'taskkill //F //IM git-bash.exe' EXIT
  echo "turn off firewall" >> turnOffFirewall.txt
  start netsh advfirewall set allprofiles state off
  # choco install -y --no-progress nmap --version 7.12 --debug --allow-empty-checksums
  choco install -y --no-progress nssm
  # choco install -y --no-progress googlechrome --ignore-checksums
  # choco install -y --no-progress firefox
  echo done >> done.txt
fi


echo "-------------------ESHOST = ${ESHOST}"

# . ./get_builds.sh

echo -e "\n-- `date` Install packages or extract archives"
. ./install_packages.sh

# if [ "${XPACK}" = "YES" ]; then
# . ./install_xpacks.sh
# fi

if [ "${XPACK}" = "YES" ]; then
. ./install_code_plugins.sh
fi

# Write phase1.marker so the Windows provision.bat can check for it and
# know that we made it here.
# Other platforms probably don't need it.
echo "SUCCESS" > phase1.marker

if [ "${PLATFORM}" = "-windows-x86_64" ]; then
  echo "after sleep 60 we'll taskkill //F //IM git-bash.exe"
  sleep 60
  taskkill //F //IM git-bash.exe
fi
